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

    const { role } = await getWorkspaceViewer(ctx, workspace)
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

    channels.sort((left, right) => {
      const leftLastMessageAt =
        statsByConversationId.get(String(left._id))?.lastMessageAt ??
        left.createdAt ??
        0
      const rightLastMessageAt =
        statsByConversationId.get(String(right._id))?.lastMessageAt ??
        right.createdAt ??
        0

      return rightLastMessageAt - leftLastMessageAt
    })

    return {
      currentRole: role,
      channels: channels.map((channel) => {
        const stats = statsByConversationId.get(String(channel._id))

        return {
          id: String(channel._id),
          slug: channel.slug,
          name: channel.name,
          description: channel.description,
          messageCount: stats?.count ?? 0,
          lastMessageAt: stats?.lastMessageAt ?? channel.createdAt ?? null,
        }
      }),
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

    const { role } = await getWorkspaceViewer(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      return null
    }

    return {
      slug: convo.slug,
      name: convo.name,
      description: convo.description,
      kind: convo.kind,
      canManage: role === "admin",
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

    await getWorkspaceViewer(ctx, workspace)

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
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
      createdByUserId: user._id,
      createdAt: Date.now(),
    })

    return {
      channelId: String(conversationId),
      slug,
    }
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

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
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
