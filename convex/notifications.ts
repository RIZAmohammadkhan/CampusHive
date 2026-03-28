import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import { getWorkspaceBySlug } from "./lib/workspaces"
import type { Id, MutationCtx, ReadCtx } from "./types"

type NotificationKind =
  | "dm"
  | "mention"
  | "workspaceEvent"
  | "clubEvent"
  | "taskAssigned"
  | "taskVolunteer"

function truncateNotificationBody(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ")
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized
}

export async function createNotifications(
  ctx: MutationCtx,
  {
    workspaceId,
    recipientUserIds,
    kind,
    title,
    body,
    route,
    actorUserId,
    conversationId,
    eventId,
    taskId,
  }: {
    workspaceId: Id<"workspaces">
    recipientUserIds: Array<Id<"users">>
    kind: NotificationKind
    title: string
    body: string
    route: string
    actorUserId?: Id<"users">
    conversationId?: Id<"conversations">
    eventId?: Id<"events"> | Id<"clubEvents">
    taskId?: Id<"tasks">
  }
) {
  const now = Date.now()
  const uniqueRecipientIds = Array.from(new Set(recipientUserIds))

  for (const recipientUserId of uniqueRecipientIds) {
    if (actorUserId && recipientUserId === actorUserId) {
      continue
    }

    await ctx.db.insert("notifications", {
      workspaceId,
      userId: recipientUserId,
      kind,
      title: title.trim(),
      body: truncateNotificationBody(body),
      route,
      actorUserId,
      conversationId,
      eventId,
      taskId,
      createdAt: now,
    })
  }
}

export const list = queryGeneric({
  args: {
    workspaceSlug: v.string(),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return {
        unreadCount: 0,
        items: [],
      }
    }

    const { currentUser } = await getWorkspaceViewer(ctx, workspace)

    if (!currentUser) {
      return {
        unreadCount: 0,
        items: [],
      }
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_user_created_at", (q) =>
        q.eq("workspaceId", workspace._id).eq("userId", currentUser._id)
      )
      .order("desc")
      .take(25)

    return {
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      items: notifications.map((notification) => ({
        id: String(notification._id),
        kind: notification.kind,
        title: notification.title,
        body: notification.body,
        route: notification.route,
        createdAt: notification.createdAt,
        readAt: notification.readAt ?? null,
      })),
    }
  },
})

export const markAllRead = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_workspace_and_user_created_at", (q) =>
        q.eq("workspaceId", workspace._id).eq("userId", user._id)
      )
      .collect()
    const now = Date.now()

    for (const notification of notifications) {
      if (notification.readAt) {
        continue
      }

      await ctx.db.patch(notification._id, {
        readAt: now,
      })
    }

    return null
  },
})
