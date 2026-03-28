import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  assertWorkspaceAdmin,
  getDisplayNameFromUser,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import { getWorkspaceBySlug } from "./lib/workspaces"
import type { Doc, Id, MutationCtx, QueryCtx } from "./types"

const taskPriority = v.union(v.literal("High"), v.literal("Medium"), v.literal("Low"))
const taskStatus = v.union(
  v.literal("acknowledged"),
  v.literal("inProgress"),
  v.literal("done"),
  v.literal("flagged")
)
const taskStatuses = ["acknowledged", "inProgress", "done", "flagged"] as const
type TaskStatus = (typeof taskStatuses)[number]

function statusToColumn(status: TaskStatus) {
  if (status === "acknowledged") return "now" as const
  if (status === "inProgress") return "next" as const
  return "later" as const
}

function legacyStatusFromColumn(column: "now" | "next" | "later"): TaskStatus {
  if (column === "now") return "acknowledged"
  if (column === "next") return "inProgress"
  return "done"
}

function resolveTaskStatus(task: Doc<"tasks">): TaskStatus {
  return task.status ?? legacyStatusFromColumn(task.column)
}

function labelForStatus(status: TaskStatus) {
  if (status === "acknowledged") return "Acknowledged"
  if (status === "inProgress") return "In progress"
  if (status === "done") return "Done"
  return "Needs help"
}

async function requireTask(
  ctx: QueryCtx | MutationCtx,
  taskId: Id<"tasks">
): Promise<Doc<"tasks">> {
  const task = await ctx.db.get(taskId)

  if (!task) {
    throw new Error("Event task not found.")
  }

  return task
}

async function requireWorkspaceMemberUser(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
): Promise<Doc<"workspaceMembers">> {
  const member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .unique()

  if (!member) {
    throw new Error("Assignee must belong to this campus space.")
  }

  return member
}

async function listWorkspaceMembers(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) {
  const members = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_role", (q) => q.eq("workspaceId", workspaceId))
    .collect()

  const users = await Promise.all(
    members.map(async (member) => {
      const user = await ctx.db.get(member.userId)

      return {
        id: String(member.userId),
        name: getDisplayNameFromUser(user),
        imageUrl: user?.imageUrl ?? null,
        role: member.role,
      }
    })
  )

  users.sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "admin" ? -1 : 1
    }

    return left.name.localeCompare(right.name)
  })

  return users
}

async function nextOrderForColumn(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  column: "now" | "next" | "later"
) {
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_and_column_order", (q) =>
      q.eq("workspaceId", workspaceId).eq("column", column)
    )
    .collect()

  return existing.reduce((maxOrder, task) => Math.max(maxOrder, task.order), -1) + 1
}

export const board = queryGeneric({
  args: {
    workspaceSlug: v.string(),
  },
  handler: async (ctx: QueryCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    const { role } = await getWorkspaceViewer(ctx, workspace)
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_column_order", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const members = await listWorkspaceMembers(ctx, workspace._id)
    const memberNameById = new Map(
      members.map((member) => [member.id, member.name])
    )

    return {
      canManage: role === "admin",
      members,
      summary: [
        {
          label: "Open tasks",
          value: tasks
            .filter((task) => resolveTaskStatus(task) !== "done")
            .length.toString()
            .padStart(2, "0"),
          detail: "event operations cards tracked across this campus",
        },
        {
          label: "Assigned",
          value: tasks
            .filter((task) => task.assigneeUserId)
            .length.toString()
            .padStart(2, "0"),
          detail: "tasks already owned by a specific student or lead",
        },
        {
          label: "Needs help",
          value: tasks
            .filter((task) => resolveTaskStatus(task) === "flagged")
            .length.toString()
            .padStart(2, "0"),
          detail: "cards that were flagged as blocked or at risk",
        },
      ],
      columns: taskStatuses.map((status) => ({
        id: status,
        name: labelForStatus(status),
        cards: tasks
          .filter((task) => resolveTaskStatus(task) === status)
          .sort((left, right) => {
            if (left.order !== right.order) {
              return left.order - right.order
            }

            return (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
          })
          .map((task) => ({
            id: String(task._id),
            title: task.title,
            description: task.description ?? "",
            dueLabel: task.dueLabel,
            priority: task.priority,
            status: resolveTaskStatus(task),
            assigneeUserId: task.assigneeUserId ? String(task.assigneeUserId) : null,
            assigneeName: task.assigneeUserId
              ? memberNameById.get(String(task.assigneeUserId)) ?? task.ownerName
              : null,
            updatedAt: task.updatedAt ?? null,
          })),
      })),
    }
  },
})

export const createTask = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priority: taskPriority,
    dueLabel: v.optional(v.string()),
    assigneeUserId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { role, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    assertWorkspaceAdmin(role)

    const title = args.title.trim()
    const description = args.description?.trim() ?? ""
    const dueLabel = args.dueLabel?.trim() ?? ""

    if (title.length < 3) {
      throw new Error("Task title must be at least 3 characters long.")
    }

    if (title.length > 120) {
      throw new Error("Task title must be 120 characters or fewer.")
    }

    if (description.length > 400) {
      throw new Error("Task notes must be 400 characters or fewer.")
    }

    if (dueLabel.length > 60) {
      throw new Error("Due label must be 60 characters or fewer.")
    }

    let ownerName = "Unassigned"

    if (args.assigneeUserId) {
      await requireWorkspaceMemberUser(ctx, workspace._id, args.assigneeUserId)
      const assignee = await ctx.db.get(args.assigneeUserId)
      ownerName = getDisplayNameFromUser(assignee) ?? ownerName
    }

    const column = statusToColumn(args.status)
    const nextOrder = await nextOrderForColumn(ctx, workspace._id, column)

    const taskId = await ctx.db.insert("tasks", {
      workspaceId: workspace._id,
      title,
      description: description || undefined,
      column,
      status: args.status,
      ownerName,
      dueLabel: dueLabel || "No due date",
      priority: args.priority,
      order: nextOrder,
      assigneeUserId: args.assigneeUserId ?? undefined,
      createdByUserId: user._id,
      updatedAt: Date.now(),
    })

    return {
      taskId: String(taskId),
    }
  },
})

export const assignTask = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    taskId: v.id("tasks"),
    assigneeUserId: v.union(v.id("users"), v.null()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { role } = await syncCurrentWorkspaceMember(ctx, workspace)
    assertWorkspaceAdmin(role)

    const task = await requireTask(ctx, args.taskId)

    if (task.workspaceId !== workspace._id) {
      throw new Error("Event task does not belong to this campus space.")
    }

    let ownerName = "Unassigned"

    if (args.assigneeUserId) {
      await requireWorkspaceMemberUser(ctx, workspace._id, args.assigneeUserId)
      const assignee = await ctx.db.get(args.assigneeUserId)
      ownerName = getDisplayNameFromUser(assignee) ?? ownerName
    }

    await ctx.db.patch(task._id, {
      assigneeUserId: args.assigneeUserId ?? undefined,
      ownerName,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const updateTaskStatus = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    taskId: v.id("tasks"),
    status: taskStatus,
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    await syncCurrentWorkspaceMember(ctx, workspace)

    const task = await requireTask(ctx, args.taskId)

    if (task.workspaceId !== workspace._id) {
      throw new Error("Event task does not belong to this campus space.")
    }

    const nextColumn = statusToColumn(args.status)
    const nextOrder =
      task.column === nextColumn
        ? task.order
        : await nextOrderForColumn(ctx, workspace._id, nextColumn)

    await ctx.db.patch(task._id, {
      column: nextColumn,
      status: args.status,
      order: nextOrder,
      updatedAt: Date.now(),
    })

    return null
  },
})
