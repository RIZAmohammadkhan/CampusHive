import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import {
  cleanupLegacyWorkspaceDemoData,
  ensureDefaultChannel,
  getWorkspaceBySlug,
  upsertWorkspace,
} from "./lib/workspaces"
import { getActivePresenceEntries } from "./presence"
import type { Doc } from "./types"
import type { QueryCtx } from "./types"
import type { MutationCtx } from "./types"

function splitUserName(name: string, firstName?: string, lastName?: string) {
  const normalizedFirstName = firstName?.trim()
  const normalizedLastName = lastName?.trim()

  if (normalizedFirstName || normalizedLastName) {
    return {
      firstName: normalizedFirstName ?? "",
      lastName: normalizedLastName ?? "",
    }
  }

  const parts = name.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  }
}

function resolveConversationMemberRole(
  conversation: Doc<"conversations">,
  membership: Doc<"conversationMembers">
) {
  if (membership.role) {
    return membership.role
  }

  return conversation.createdByUserId === membership.userId ? "owner" : "member"
}

export const bootstrap = mutationGeneric({
  args: {
    clerkOrgId: v.string(),
    slug: v.string(),
    name: v.string(),
    userName: v.optional(v.string()),
    userFirstName: v.optional(v.string()),
    userLastName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userImageUrl: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, {
      clerkOrgId: args.clerkOrgId,
      slug: args.slug,
    })

    const workspace = await upsertWorkspace(ctx, {
      clerkOrgId: args.clerkOrgId,
      slug: args.slug,
      name: args.name,
    })

    const { user, role } = await syncCurrentWorkspaceMember(ctx, workspace, {
      name: args.userName,
      firstName: args.userFirstName,
      lastName: args.userLastName,
      email: args.userEmail,
      imageUrl: args.userImageUrl,
    })

    await cleanupLegacyWorkspaceDemoData(ctx, workspace._id)
    await ensureDefaultChannel(ctx, workspace._id, user._id)

    return {
      workspaceId: String(workspace._id),
      userId: String(user._id),
      role,
    }
  },
})

export const viewer = queryGeneric({
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

    const { currentUser, role } = await getWorkspaceViewer(ctx, workspace)

    return {
      workspaceId: String(workspace._id),
      workspaceName: workspace.name,
      role,
      currentUserId: currentUser ? String(currentUser._id) : null,
    }
  },
})

export const directory = queryGeneric({
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

    const { currentUser, role } = await getWorkspaceViewer(ctx, workspace)
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_role", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const activePresence = await getActivePresenceEntries(ctx, workspace._id)
    const activeByUserId = new Map(
      activePresence.map((entry) => [String(entry.userId), entry.lastSeenAt])
    )

    const directory = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId)
        const lastSeenAt = activeByUserId.get(String(member.userId)) ?? null

        return {
          id: String(member.userId),
          name: user?.name ?? "Student member",
          email: user?.email ?? null,
          imageUrl: user?.imageUrl ?? null,
          role: member.role,
          isCurrentUser: currentUser?._id === member.userId,
          isActive: lastSeenAt !== null,
          lastSeenAt,
        }
      })
    )

    directory.sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === "admin" ? -1 : 1
      }

      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })

    return {
      currentRole: role,
      members: directory,
    }
  },
})

export const memberProfile = queryGeneric({
  args: {
    workspaceSlug: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx: QueryCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    await getWorkspaceViewer(ctx, workspace)

    const [workspaceMember, user] = await Promise.all([
      ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", workspace._id).eq("userId", args.userId)
        )
        .unique(),
      ctx.db.get(args.userId),
    ])

    if (!workspaceMember || !user) {
      return null
    }

    const nameParts = splitUserName(user.name, user.firstName, user.lastName)
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user_and_conversation", (q) => q.eq("userId", args.userId))
      .collect()
    const tickets = await ctx.db
      .query("clubEventTickets")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", args.userId))
      .collect()

    const clubMemberships = (
      await Promise.all(
        memberships.map(async (membership) => {
          const conversation = await ctx.db.get(membership.conversationId)

          if (
            !conversation ||
            conversation.workspaceId !== workspace._id ||
            conversation.kind !== "channel"
          ) {
            return null
          }

          return {
            id: String(conversation._id),
            slug: conversation.slug,
            name: conversation.name,
            role: resolveConversationMemberRole(conversation, membership),
            joinedAt: membership.joinedAt,
          }
        })
      )
    )
      .filter((membership) => membership !== null)
      .sort((left, right) => left.name.localeCompare(right.name))

    const eventTickets = (
      await Promise.all(
        tickets.map(async (ticket) => {
          const event = await ctx.db.get(ticket.eventId)

          if (!event || event.workspaceId !== workspace._id) {
            return null
          }

          const conversation = await ctx.db.get(event.conversationId)

          if (!conversation) {
            return null
          }

          return {
            id: String(ticket._id),
            code: ticket.code,
            eventTitle: event.title,
            clubName: conversation.name,
            createdAt: ticket.createdAt,
            checkedInAt: ticket.checkedInAt ?? null,
          }
        })
      )
    )
      .filter((ticket) => ticket !== null)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 6)

    return {
      id: String(user._id),
      name: user.name,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: user.email ?? null,
      imageUrl: user.imageUrl ?? null,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      workspaceRole: workspaceMember.role,
      joinedAt: workspaceMember.joinedAt,
      clubMemberships,
      eventTickets,
    }
  },
})
