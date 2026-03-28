import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  assertWorkspaceAdmin,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import { getWorkspaceBySlug } from "./lib/workspaces"
import type { Doc, Id, MutationCtx, ReadCtx } from "./types"

type ChannelAccess = "public" | "members"
type MembershipState = "public" | "admin" | "member" | "pending" | "notMember"

function normalizeChannelName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function createChannelSlug(name: string) {
  return normalizeChannelName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

function fallbackNameForSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function resolveConversationAccess(conversation: Doc<"conversations">): ChannelAccess {
  return conversation.access ?? (conversation.slug === "general" ? "public" : "members")
}

async function findConversation(
  ctx: ReadCtx,
  workspaceId: Id<"workspaces">,
  slug: string
): Promise<Doc<"conversations"> | null> {
  return await ctx.db
    .query("conversations")
    .withIndex("by_workspace_and_slug", (q) =>
      q.eq("workspaceId", workspaceId).eq("slug", slug)
    )
    .unique()
}

async function createUniqueChannelSlug(
  ctx: ReadCtx,
  workspaceId: Id<"workspaces">,
  name: string
) {
  const base = createChannelSlug(name) || "channel"
  let slug = base
  let suffix = 2

  while (await findConversation(ctx, workspaceId, slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  return slug
}

async function getConversationMembership(
  ctx: ReadCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation_and_user", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId)
    )
    .unique()
}

async function getConversationJoinRequest(
  ctx: ReadCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("conversationJoinRequests")
    .withIndex("by_conversation_and_user", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId)
    )
    .unique()
}

async function upsertConversationMembership(
  ctx: MutationCtx,
  {
    workspaceId,
    conversationId,
    userId,
  }: {
    workspaceId: Id<"workspaces">
    conversationId: Id<"conversations">
    userId: Id<"users">
  }
) {
  const existing = await getConversationMembership(ctx, conversationId, userId)

  if (existing) {
    return existing
  }

  const membershipId = await ctx.db.insert("conversationMembers", {
    workspaceId,
    conversationId,
    userId,
    joinedAt: Date.now(),
  })

  return (await ctx.db.get(membershipId))!
}

async function listConversationMembers(
  ctx: ReadCtx,
  conversationId: Id<"conversations">,
  currentUserId?: Id<"users">
) {
  const memberships = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect()

  const members = await Promise.all(
    memberships.map(async (membership) => {
      const user = await ctx.db.get(membership.userId)

      return {
        id: String(membership.userId),
        name: user?.name ?? "Student member",
        imageUrl: user?.imageUrl ?? null,
        joinedAt: membership.joinedAt,
        isCurrentUser: currentUserId === membership.userId,
      }
    })
  )

  members.sort((left, right) => {
    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1
    }

    return left.name.localeCompare(right.name)
  })

  return members
}

async function listPendingJoinRequests(
  ctx: ReadCtx,
  conversationId: Id<"conversations">
) {
  const requests = await ctx.db
    .query("conversationJoinRequests")
    .withIndex("by_conversation_and_status", (q) =>
      q.eq("conversationId", conversationId).eq("status", "pending")
    )
    .collect()

  const pending = await Promise.all(
    requests.map(async (request) => {
      const user = await ctx.db.get(request.userId)

      return {
        userId: String(request.userId),
        name: user?.name ?? "Student member",
        imageUrl: user?.imageUrl ?? null,
        createdAt: request.createdAt,
      }
    })
  )

  pending.sort((left, right) => left.createdAt - right.createdAt)
  return pending
}

function membershipStateForViewer({
  access,
  isAdmin,
  isMember,
  hasPendingRequest,
}: {
  access: ChannelAccess
  isAdmin: boolean
  isMember: boolean
  hasPendingRequest: boolean
}): MembershipState {
  if (access === "public") {
    return "public"
  }

  if (isAdmin) {
    return "admin"
  }

  if (isMember) {
    return "member"
  }

  if (hasPendingRequest) {
    return "pending"
  }

  return "notMember"
}

function canAccessConversation({
  access,
  isAdmin,
  isMember,
}: {
  access: ChannelAccess
  isAdmin: boolean
  isMember: boolean
}) {
  return access === "public" || isAdmin || isMember
}

export const listChannels = queryGeneric({
  args: {
    workspaceSlug: v.string(),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    const { currentUser, role } = await getWorkspaceViewer(ctx, workspace)
    const workspaceMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_role", (q) => q.eq("workspaceId", workspace._id))
      .collect()
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_workspace_and_slug", (q) => q.eq("workspaceId", workspace._id))
      .collect()
    const channels = conversations.filter((conversation) => conversation.kind === "channel")
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const statsByConversationId = new Map<
      string,
      { count: number; lastMessageAt: number | null }
    >()

    for (const message of messages) {
      const key = String(message.conversationId)
      const existing = statsByConversationId.get(key)

      statsByConversationId.set(key, {
        count: (existing?.count ?? 0) + 1,
        lastMessageAt: Math.max(existing?.lastMessageAt ?? 0, message.createdAt),
      })
    }

    const channelsWithMeta = await Promise.all(
      channels.map(async (channel) => {
        const access = resolveConversationAccess(channel)
        const conversationMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q) => q.eq("conversationId", channel._id))
          .collect()
        const membership = currentUser
          ? await getConversationMembership(ctx, channel._id, currentUser._id)
          : null
        const joinRequest = currentUser
          ? await getConversationJoinRequest(ctx, channel._id, currentUser._id)
          : null
        const stats = statsByConversationId.get(String(channel._id))
        const membershipState = membershipStateForViewer({
          access,
          isAdmin: role === "admin",
          isMember: Boolean(membership),
          hasPendingRequest: joinRequest?.status === "pending",
        })

        return {
          id: String(channel._id),
          slug: channel.slug,
          name: channel.name,
          description: channel.description,
          access,
          memberCount:
            access === "public" ? workspaceMembers.length : conversationMembers.length,
          messageCount: stats?.count ?? 0,
          lastMessageAt: stats?.lastMessageAt ?? channel.createdAt ?? null,
          membershipState,
          canOpen: canAccessConversation({
            access,
            isAdmin: role === "admin",
            isMember: Boolean(membership),
          }),
          canRequestToJoin:
            access === "members" &&
            role !== "admin" &&
            !membership &&
            joinRequest?.status !== "pending",
        }
      })
    )

    channelsWithMeta.sort((left, right) => {
      const leftLastMessageAt = left.lastMessageAt ?? 0
      const rightLastMessageAt = right.lastMessageAt ?? 0

      return rightLastMessageAt - leftLastMessageAt
    })

    return {
      currentRole: role,
      channels: channelsWithMeta,
    }
  },
})

export const conversation = queryGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    const { currentUser, role } = await getWorkspaceViewer(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      return null
    }

    const access = resolveConversationAccess(convo)
    const membership = currentUser
      ? await getConversationMembership(ctx, convo._id, currentUser._id)
      : null
    const joinRequest = currentUser
      ? await getConversationJoinRequest(ctx, convo._id, currentUser._id)
      : null
    const canViewMessages = canAccessConversation({
      access,
      isAdmin: role === "admin",
      isMember: Boolean(membership),
    })
    const members =
      access === "members" ? await listConversationMembers(ctx, convo._id, currentUser?._id) : []
    const pendingRequests =
      role === "admin" && access === "members"
        ? await listPendingJoinRequests(ctx, convo._id)
        : []

    return {
      slug: convo.slug,
      name: convo.name,
      description: convo.description,
      kind: convo.kind,
      access,
      canManage: role === "admin",
      memberCount: access === "public" ? null : members.length,
      viewerMembershipState: membershipStateForViewer({
        access,
        isAdmin: role === "admin",
        isMember: Boolean(membership),
        hasPendingRequest: joinRequest?.status === "pending",
      }),
      canViewMessages,
      canPostMessages: canViewMessages,
      canRequestToJoin:
        access === "members" &&
        role !== "admin" &&
        !membership &&
        joinRequest?.status !== "pending",
      canLeave: access === "members" && role !== "admin" && Boolean(membership),
      members,
      pendingRequests,
    }
  },
})

export const listMessages = queryGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return []
    }

    const { currentUser, role } = await getWorkspaceViewer(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      return []
    }

    const access = resolveConversationAccess(convo)
    const membership = currentUser
      ? await getConversationMembership(ctx, convo._id, currentUser._id)
      : null

    if (
      !canAccessConversation({
        access,
        isAdmin: role === "admin",
        isMember: Boolean(membership),
      })
    ) {
      return []
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created_at", (q) =>
        q.eq("conversationId", convo._id)
      )
      .collect()

    return await Promise.all(
      messages.map(async (message) => {
        const author = await ctx.db.get(message.authorId)

        return {
          id: String(message._id),
          body: message.body,
          createdAt: message.createdAt,
          author: {
            name: author?.name ?? "Student member",
            imageUrl: author?.imageUrl ?? null,
            isCurrentUser: author?.externalId === identity.subject,
          },
        }
      })
    )
  },
})

export const createChannel = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
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

    const name = normalizeChannelName(args.name)
    const description = args.description?.trim() ?? ""

    if (name.length < 2) {
      throw new Error("Club space name must be at least 2 characters long.")
    }

    if (name.length > 60) {
      throw new Error("Club space name must be 60 characters or fewer.")
    }

    if (description.length > 240) {
      throw new Error("Club space description must be 240 characters or fewer.")
    }

    const slug = await createUniqueChannelSlug(ctx, workspace._id, name)
    const existing = await findConversation(ctx, workspace._id, slug)

    if (existing) {
      throw new Error("A club space with this name already exists.")
    }

    const conversationId = await ctx.db.insert("conversations", {
      workspaceId: workspace._id,
      slug,
      name,
      description:
        description || `Announcements and discussion for ${fallbackNameForSlug(slug)}.`,
      kind: "channel",
      access: "members",
      createdByUserId: user._id,
      createdAt: Date.now(),
    })

    await upsertConversationMembership(ctx, {
      workspaceId: workspace._id,
      conversationId,
      userId: user._id,
    })

    return {
      channelId: String(conversationId),
      slug,
    }
  },
})

export const requestToJoin = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { role, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("This campus channel is already open to everyone.")
    }

    if (role === "admin") {
      throw new Error("Institute admins already have access to every club space.")
    }

    const existingMembership = await getConversationMembership(ctx, convo._id, user._id)

    if (existingMembership) {
      throw new Error("You are already a member of this club space.")
    }

    const existingRequest = await getConversationJoinRequest(ctx, convo._id, user._id)
    const now = Date.now()

    if (existingRequest?.status === "pending") {
      throw new Error("Your join request is already pending review.")
    }

    if (existingRequest) {
      await ctx.db.patch(existingRequest._id, {
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("conversationJoinRequests", {
        workspaceId: workspace._id,
        conversationId: convo._id,
        userId: user._id,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
    }

    return null
  },
})

export const reviewJoinRequest = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    userId: v.id("users"),
    approve: v.boolean(),
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

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("This campus channel does not use join requests.")
    }

    const request = await getConversationJoinRequest(ctx, convo._id, args.userId)

    if (!request || request.status !== "pending") {
      throw new Error("This join request is no longer pending.")
    }

    const nextStatus = args.approve ? "approved" : "rejected"
    const now = Date.now()

    await ctx.db.patch(request._id, {
      status: nextStatus,
      updatedAt: now,
      reviewedAt: now,
      reviewedByUserId: user._id,
    })

    if (args.approve) {
      await upsertConversationMembership(ctx, {
        workspaceId: workspace._id,
        conversationId: convo._id,
        userId: args.userId,
      })
    }

    return null
  },
})

export const leaveChannel = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { role, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("This campus channel does not require membership.")
    }

    if (role === "admin") {
      throw new Error("Institute admins keep access across all club spaces.")
    }

    const membership = await getConversationMembership(ctx, convo._id, user._id)

    if (!membership) {
      throw new Error("You are not a member of this club space.")
    }

    await ctx.db.delete(membership._id)
    return null
  },
})

export const removeMember = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    userId: v.id("users"),
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

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("This campus channel does not use club membership.")
    }

    const membership = await getConversationMembership(ctx, convo._id, args.userId)

    if (!membership) {
      throw new Error("That student is not a member of this club space.")
    }

    await ctx.db.delete(membership._id)
    return null
  },
})

export const sendMessage = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    body: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)
    const trimmed = args.body.trim()

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    if (!trimmed) {
      throw new Error("Message body is required.")
    }

    if (trimmed.length > 4_000) {
      throw new Error("Messages must be 4,000 characters or fewer.")
    }

    const { user, role } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const access = resolveConversationAccess(convo)
    const membership = await getConversationMembership(ctx, convo._id, user._id)

    if (
      !canAccessConversation({
        access,
        isAdmin: role === "admin",
        isMember: Boolean(membership),
      })
    ) {
      throw new Error("Join this club space before posting in it.")
    }

    await ctx.db.insert("messages", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      authorId: user._id,
      body: trimmed,
      createdAt: Date.now(),
    })

    return null
  },
})
