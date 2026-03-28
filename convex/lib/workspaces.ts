import type { Doc, Id, Insert, MutationCtx, ReadCtx } from "../types"

const DEFAULT_CHANNEL = {
  slug: "general",
  name: "Campus Feed",
  description: "Shared campus updates, introductions, and must-see announcements.",
  category: "Campus Updates",
}

const LEGACY_FILLER_CHANNELS = new Set([
  "product",
  "design",
  "ops",
  "dm/asha",
  "dm/ravi",
  "dm/mina",
])

export async function getWorkspaceBySlug(
  ctx: ReadCtx,
  slug: string
): Promise<Doc<"workspaces"> | null> {
  return await ctx.db
    .query("workspaces")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
}

export async function getWorkspaceByClerkOrgId(
  ctx: ReadCtx,
  clerkOrgId: string
): Promise<Doc<"workspaces"> | null> {
  return await ctx.db
    .query("workspaces")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .unique()
}

export async function requireWorkspaceBySlug(
  ctx: ReadCtx,
  slug: string
): Promise<Doc<"workspaces">> {
  const workspace = await getWorkspaceBySlug(ctx, slug)

  if (!workspace) {
    throw new Error(`Campus space ${slug} is not available yet`)
  }

  return workspace
}

export async function upsertWorkspace(
  ctx: MutationCtx,
  {
    clerkOrgId,
    slug,
    name,
  }: {
    clerkOrgId: string
    slug: string
    name: string
  }
): Promise<Doc<"workspaces">> {
  const existing =
    (await getWorkspaceByClerkOrgId(ctx, clerkOrgId)) ??
    (await getWorkspaceBySlug(ctx, slug))
  const patch: Insert<"workspaces"> = {
    clerkOrgId,
    slug,
    name,
    createdAt: existing?.createdAt ?? Date.now(),
  }

  if (existing) {
    await ctx.db.patch(existing._id, patch)
    return (await ctx.db.get(existing._id))!
  }

  const workspaceId = await ctx.db.insert("workspaces", patch)
  return (await ctx.db.get(workspaceId))!
}

export async function listWorkspaceConversations(
  ctx: ReadCtx,
  workspaceId: Id<"workspaces">
) {
  return await ctx.db
    .query("conversations")
    .withIndex("by_workspace_and_slug", (q) => q.eq("workspaceId", workspaceId))
    .collect()
}

export async function ensureDefaultChannel(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  createdByUserId?: Id<"users">
): Promise<Doc<"conversations">> {
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_workspace_and_slug", (q) =>
      q.eq("workspaceId", workspaceId).eq("slug", DEFAULT_CHANNEL.slug)
    )
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: DEFAULT_CHANNEL.name,
      description: DEFAULT_CHANNEL.description,
      category: DEFAULT_CHANNEL.category,
      kind: "channel",
      access: "public",
      createdByUserId: existing.createdByUserId ?? createdByUserId,
      createdAt: existing.createdAt ?? Date.now(),
    })
    return (await ctx.db.get(existing._id))!
  }

  const conversationId = await ctx.db.insert("conversations", {
    workspaceId,
    slug: DEFAULT_CHANNEL.slug,
    name: DEFAULT_CHANNEL.name,
    description: DEFAULT_CHANNEL.description,
    category: DEFAULT_CHANNEL.category,
    kind: "channel",
    access: "public",
    createdByUserId,
    createdAt: Date.now(),
  })

  return (await ctx.db.get(conversationId))!
}

export async function cleanupLegacyWorkspaceDemoData(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">
): Promise<void> {
  const seedUsers = (await ctx.db.query("users").collect()).filter((user) => user.isSeed)
  const seedUserIds = new Set(seedUsers.map((user) => user._id))
  const conversations = await listWorkspaceConversations(ctx, workspaceId)

  for (const conversation of conversations) {
    if (
      conversation.slug !== DEFAULT_CHANNEL.slug &&
      !LEGACY_FILLER_CHANNELS.has(conversation.slug)
    ) {
      continue
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created_at", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .collect()

    let hasHumanMessages = false

    for (const message of messages) {
      if (seedUserIds.has(message.authorId)) {
        await ctx.db.delete(message._id)
        continue
      }

      hasHumanMessages = true
    }

    if (
      conversation.slug !== DEFAULT_CHANNEL.slug &&
      LEGACY_FILLER_CHANNELS.has(conversation.slug) &&
      !hasHumanMessages
    ) {
      await ctx.db.delete(conversation._id)
    }
  }
}
