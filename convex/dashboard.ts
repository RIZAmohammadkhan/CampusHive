import { queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  getDisplayNameFromUser,
  getWorkspaceViewer,
  requireIdentity,
} from "./lib/auth"
import { getWorkspaceBySlug } from "./lib/workspaces"
import { getActivePresenceEntries } from "./presence"
import type { QueryCtx } from "./types"

function formatCount(value: number) {
  return value.toString().padStart(2, "0")
}

export const office = queryGeneric({
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
    const activePresence = await getActivePresenceEntries(ctx, workspace._id)
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_role", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const channels = (
      await ctx.db
        .query("conversations")
        .withIndex("by_workspace_and_slug", (q) =>
          q.eq("workspaceId", workspace._id)
        )
        .collect()
    ).filter((conversation) => conversation.kind === "channel")
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_and_column_order", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const activePresenceByUserId = new Map(
      activePresence.map((entry) => [String(entry.userId), entry])
    )
    const messageStatsByConversationId = new Map<
      string,
      { count: number; lastMessageAt: number | null }
    >()

    for (const message of messages) {
      const key = String(message.conversationId)
      const existing = messageStatsByConversationId.get(key)

      messageStatsByConversationId.set(key, {
        count: (existing?.count ?? 0) + 1,
        lastMessageAt: Math.max(existing?.lastMessageAt ?? 0, message.createdAt),
      })
    }

    const memberSnapshots = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId)
        const presence = activePresenceByUserId.get(String(member.userId))

        return {
          id: String(member.userId),
          name: getDisplayNameFromUser(user),
          role: member.role,
          route: presence?.route ?? null,
          routeLabel: presence?.route
            ? presence.route === "/"
              ? "Hub"
              : presence.route.startsWith("/messages")
                ? "Messages"
              : presence.route.startsWith("/channels")
                  ? "Club spaces"
                  : presence.route.startsWith("/people")
                    ? "People"
                  : presence.route.startsWith("/projects")
                  ? "Tasks"
                  : presence.route.startsWith("/calendar")
                    ? "Events"
                    : "Campus space"
            : null,
          isActive: Boolean(presence),
          lastSeenAt: presence?.lastSeenAt ?? member.lastActiveAt,
        }
      })
    )

    memberSnapshots.sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1
      }

      return right.lastSeenAt - left.lastSeenAt
    })

    const channelSnapshots = channels
      .map((channel) => {
        const stats = messageStatsByConversationId.get(String(channel._id))

        return {
          id: String(channel._id),
          slug: channel.slug,
          name: channel.name,
          description: channel.description,
          category:
            channel.category?.trim() ??
            (channel.slug === "general" ? "Campus Updates" : "General Club"),
          messageCount: stats?.count ?? 0,
          lastMessageAt: stats?.lastMessageAt ?? channel.createdAt ?? null,
        }
      })
      .sort((left, right) => (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0))

    return {
      currentRole: role,
      metrics: [
        {
          label: "Students",
          value: formatCount(members.length),
          detail: "people currently synced into this campus space",
        },
        {
          label: "Active now",
          value: formatCount(activePresence.length),
          detail: "students sending a live presence heartbeat",
        },
        {
          label: "Club spaces",
          value: formatCount(channelSnapshots.length),
          detail: "shared community spaces available right now",
        },
        {
          label: "Tasks",
          value: formatCount(tasks.length),
          detail: "operations cards tracked across the campus board",
        },
      ],
      activeMembers: memberSnapshots.slice(0, 5),
      channels: channelSnapshots.slice(0, 6),
      recentTasks: tasks
        .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
        .slice(0, 6)
        .map((task) => ({
          id: String(task._id),
          title: task.title,
          column: task.column,
          priority: task.priority,
          assigneeName: task.assigneeUserId ? task.ownerName : null,
        })),
    }
  },
})
