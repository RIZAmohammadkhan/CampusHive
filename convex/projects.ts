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
const taskKind = v.union(v.literal("assigned"), v.literal("volunteer"))
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

function resolveTaskKind(task: Doc<"tasks">) {
  return task.taskKind ?? "assigned"
}

function statusLabel(status: TaskStatus) {
  if (status === "acknowledged") return "Ready"
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

async function requireWorkspaceEvent(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  eventId: Id<"events">
): Promise<Doc<"events">> {
  const event = await ctx.db.get(eventId)

  if (!event || event.workspaceId !== workspaceId) {
    throw new Error("Choose an event from this campus calendar.")
  }

  return event
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

function eventSortValue(event: Doc<"events"> | null) {
  if (!event) {
    return "9999-99-99"
  }

  return `${event.dayKey}-${String(event.order).padStart(4, "0")}`
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

    const { role, currentUser } = await getWorkspaceViewer(ctx, workspace)
    const [tasks, members, events] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_workspace_and_column_order", (q) =>
          q.eq("workspaceId", workspace._id)
        )
        .collect(),
      listWorkspaceMembers(ctx, workspace._id),
      ctx.db
        .query("events")
        .withIndex("by_workspace_and_day_order", (q) =>
          q.eq("workspaceId", workspace._id)
        )
        .collect(),
    ])

    const eventById = new Map(events.map((event) => [String(event._id), event]))
    const memberNameById = new Map(members.map((member) => [member.id, member.name]))

    const taskItems = tasks
      .map((task) => {
        const event = task.eventId ? eventById.get(String(task.eventId)) ?? null : null
        const kind = resolveTaskKind(task)
        const status = resolveTaskStatus(task)
        const assigneeId = task.assigneeUserId ? String(task.assigneeUserId) : null
        const assigneeName = assigneeId
          ? memberNameById.get(assigneeId) ?? task.ownerName
          : null

        return {
          id: String(task._id),
          eventId: task.eventId ? String(task.eventId) : null,
          eventTitle: event?.title ?? "General campus task",
          eventDateLabel: event ? `${event.dateLabel} · ${event.time}` : "No linked event",
          eventDayKey: event?.dayKey ?? null,
          title: task.title,
          description: task.description ?? "",
          dueLabel: task.dueLabel,
          priority: task.priority,
          status,
          statusLabel: statusLabel(status),
          taskKind: kind,
          assigneeUserId: assigneeId,
          assigneeName,
          completedAt: task.completedAt ?? null,
          completedByUserId: task.completedByUserId
            ? String(task.completedByUserId)
            : null,
          completedByName: task.completedByUserId
            ? memberNameById.get(String(task.completedByUserId)) ?? null
            : null,
          completionNote: task.completionNote ?? "",
          updatedAt: task.updatedAt ?? null,
          canVolunteer:
            kind === "volunteer" &&
            !assigneeId &&
            currentUser !== null,
          isCurrentUserVolunteer:
            assigneeId !== null && currentUser?._id === task.assigneeUserId,
        }
      })
      .sort((left, right) => {
        const eventCompare = (left.eventDayKey ?? "9999-99-99").localeCompare(
          right.eventDayKey ?? "9999-99-99"
        )

        if (eventCompare !== 0) {
          return eventCompare
        }

        if (left.status !== right.status) {
          return taskStatuses.indexOf(left.status) - taskStatuses.indexOf(right.status)
        }

        return (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
      })

    const eventFilters = events
      .slice()
      .sort((left, right) => eventSortValue(left).localeCompare(eventSortValue(right)))
      .map((event) => ({
        id: String(event._id),
        title: event.title,
        dateLabel: `${event.dateLabel} · ${event.time}`,
      }))

    return {
      canManage: role === "admin",
      currentUserId: currentUser ? String(currentUser._id) : null,
      members,
      events: eventFilters,
      summary: [
        {
          label: "Open tasks",
          value: taskItems
            .filter((task) => task.status !== "done")
            .length.toString()
            .padStart(2, "0"),
          detail: "event-linked tasks still active across the campus calendar",
        },
        {
          label: "Assigned",
          value: taskItems
            .filter((task) => task.taskKind === "assigned" && task.assigneeUserId)
            .length.toString()
            .padStart(2, "0"),
          detail: "work items already owned by a specific organizer or member",
        },
        {
          label: "Volunteer asks",
          value: taskItems
            .filter((task) => task.taskKind === "volunteer" && !task.assigneeUserId)
            .length.toString()
            .padStart(2, "0"),
          detail: "open calls where someone can step up and help",
        },
      ],
      tasks: taskItems,
    }
  },
})

export const createTask = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    eventId: v.id("events"),
    taskKind,
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

    await requireWorkspaceEvent(ctx, workspace._id, args.eventId)

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

    let assigneeUserId = args.assigneeUserId ?? undefined
    let ownerName = "Unassigned"

    if (args.taskKind === "volunteer") {
      assigneeUserId = undefined
      ownerName = "Open for volunteers"
    } else if (assigneeUserId) {
      await requireWorkspaceMemberUser(ctx, workspace._id, assigneeUserId)
      const assignee = await ctx.db.get(assigneeUserId)
      ownerName = getDisplayNameFromUser(assignee)
    }

    const column = statusToColumn(args.status)
    const nextOrder = await nextOrderForColumn(ctx, workspace._id, column)

    const taskId = await ctx.db.insert("tasks", {
      workspaceId: workspace._id,
      eventId: args.eventId,
      taskKind: args.taskKind,
      title,
      description: description || undefined,
      column,
      status: args.status,
      ownerName,
      dueLabel: dueLabel || "No due date",
      priority: args.priority,
      order: nextOrder,
      assigneeUserId,
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

    let ownerName = resolveTaskKind(task) === "volunteer" ? "Open for volunteers" : "Unassigned"

    if (args.assigneeUserId) {
      await requireWorkspaceMemberUser(ctx, workspace._id, args.assigneeUserId)
      const assignee = await ctx.db.get(args.assigneeUserId)
      ownerName = getDisplayNameFromUser(assignee)
    }

    await ctx.db.patch(task._id, {
      assigneeUserId: args.assigneeUserId ?? undefined,
      ownerName,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const volunteerForTask = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const task = await requireTask(ctx, args.taskId)

    if (task.workspaceId !== workspace._id) {
      throw new Error("Event task does not belong to this campus space.")
    }

    if (resolveTaskKind(task) !== "volunteer") {
      throw new Error("This task is assigned directly by organizers.")
    }

    if (task.assigneeUserId) {
      throw new Error("Someone already stepped up for this task.")
    }

    await ctx.db.patch(task._id, {
      assigneeUserId: user._id,
      ownerName: getDisplayNameFromUser(user),
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

    const { role, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const task = await requireTask(ctx, args.taskId)

    if (task.workspaceId !== workspace._id) {
      throw new Error("Event task does not belong to this campus space.")
    }

    const canEditStatus =
      role === "admin" ||
      (task.assigneeUserId !== undefined && task.assigneeUserId === user._id)

    if (!canEditStatus) {
      throw new Error("Only organizers or the current task owner can update status.")
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
      completedAt: args.status === "done" ? task.completedAt ?? Date.now() : undefined,
      completedByUserId:
        args.status === "done" ? task.completedByUserId ?? user._id : undefined,
      completionNote: args.status === "done" ? task.completionNote : undefined,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const completeTask = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    taskId: v.id("tasks"),
    message: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const task = await requireTask(ctx, args.taskId)

    if (task.workspaceId !== workspace._id) {
      throw new Error("Event task does not belong to this campus space.")
    }

    if (!task.assigneeUserId || task.assigneeUserId !== user._id) {
      throw new Error("Only the assigned owner can mark this task complete.")
    }

    const message = args.message?.trim() ?? ""

    if (message.length > 280) {
      throw new Error("Completion note must be 280 characters or fewer.")
    }

    const nextColumn = statusToColumn("done")
    const nextOrder =
      task.column === nextColumn
        ? task.order
        : await nextOrderForColumn(ctx, workspace._id, nextColumn)

    await ctx.db.patch(task._id, {
      column: nextColumn,
      status: "done",
      order: nextOrder,
      completedAt: Date.now(),
      completedByUserId: user._id,
      completionNote: message || undefined,
      updatedAt: Date.now(),
    })

    return null
  },
})
