import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  assertWorkspaceAdmin,
  getDisplayNameFromUser,
  getWorkspaceMember,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import { createNotifications } from "./notifications"
import { getWorkspaceBySlug } from "./lib/workspaces"
import type { Doc, Id, MutationCtx, ReadCtx } from "./types"

type ChannelAccess = "public" | "members"
type ClubRole = "owner" | "officer" | "member"
type MembershipState = "public" | "admin" | "owner" | "officer" | "member" | "pending" | "notMember"
const liveStatus = v.union(v.literal("open"), v.literal("closed"))
const ticketCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const campusFeedDiscussionSection = {
  slug: "feed",
  name: "Campus Feed",
  description: "Workspace-wide announcements and updates for everyone.",
} as const
const defaultDiscussionSectionSeed = [
  {
    slug: "announcements",
    name: "Announcements",
    description: "Official updates from club leads, officers, and organizers.",
  },
  {
    slug: "general",
    name: "General",
    description: "Day-to-day club conversation, intros, and member chat.",
  },
  {
    slug: "events",
    name: "Events",
    description: "Planning details, reminders, and event-day coordination.",
  },
] as const
const directMessageDiscussionSection = {
  slug: "chat",
  name: "Chat",
  description: "Private messages between members.",
} as const

type DiscussionSectionSnapshot = {
  id: string | null
  slug: string
  name: string
  description: string | null
  position: number
}

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

function createDiscussionSectionSlug(name: string) {
  return normalizeChannelName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : undefined
}

function normalizeDiscussionSectionName(value: string) {
  return normalizeChannelName(value).slice(0, 40)
}

function createOptionId(label: string, index: number) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24)

  return `${slug || "option"}-${index + 1}`
}

function normalizeMentionToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildMentionTokens(user: {
  name?: string
  firstName?: string
  lastName?: string
  email?: string
}) {
  const tokens = new Set<string>()
  const directValues = [user.name, user.firstName, user.lastName]

  for (const value of directValues) {
    const normalized = value?.trim()

    if (!normalized) {
      continue
    }

    const token = normalizeMentionToken(normalized)

    if (token) {
      tokens.add(token)
      tokens.add(token.replace(/-/g, ""))
    }

    normalized
      .split(/\s+/)
      .map((part) => normalizeMentionToken(part))
      .filter(Boolean)
      .forEach((part) => {
        tokens.add(part)
      })
  }

  const emailLocalPart = user.email?.split("@")[0]
  const emailToken = emailLocalPart ? normalizeMentionToken(emailLocalPart) : ""

  if (emailToken) {
    tokens.add(emailToken)
  }

  return tokens
}

function normalizePollOptions(options: string[]) {
  const normalized = options
    .map((option) => option.trim())
    .filter((option) => option.length > 0)

  if (normalized.length < 2) {
    throw new Error("Polls need at least two options.")
  }

  if (normalized.length > 6) {
    throw new Error("Polls can have up to six options.")
  }

  const seen = new Set<string>()

  normalized.forEach((option) => {
    const key = option.toLowerCase()

    if (seen.has(key)) {
      throw new Error("Poll options must be unique.")
    }

    if (option.length > 60) {
      throw new Error("Each poll option must be 60 characters or fewer.")
    }

    seen.add(key)
  })

  return normalized.map((label, index) => ({
    id: createOptionId(label, index),
    label,
  }))
}

function fallbackNameForSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeClubCategory(value: string | undefined) {
  const trimmed = value?.trim() ?? ""

  if (!trimmed) {
    return "General Club"
  }

  return trimmed.replace(/\s+/g, " ").slice(0, 40)
}

function isDirectMessageConversation(conversation: Doc<"conversations">) {
  return conversation.kind === "dm"
}

function categoryForConversation(conversation: Doc<"conversations">) {
  if (conversation.category?.trim()) {
    return conversation.category.trim()
  }

  if (conversation.slug === "general") {
    return "Campus Updates"
  }

  return "General Club"
}

function resolveConversationAccess(conversation: Doc<"conversations">): ChannelAccess {
  if (isDirectMessageConversation(conversation)) {
    return "members"
  }

  return conversation.access ?? (conversation.slug === "general" ? "public" : "members")
}

function resolveConversationMemberRole(
  conversation: Doc<"conversations">,
  membership: Doc<"conversationMembers">
): ClubRole {
  if (isDirectMessageConversation(conversation)) {
    return "member"
  }

  if (membership.role) {
    return membership.role
  }

  return conversation.createdByUserId === membership.userId ? "owner" : "member"
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

async function listConversationMembershipDocs(
  ctx: ReadCtx | MutationCtx,
  conversationId: Id<"conversations">
) {
  return await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect()
}

async function listStoredDiscussionSections(
  ctx: ReadCtx | MutationCtx,
  conversationId: Id<"conversations">
) {
  return await ctx.db
    .query("clubDiscussionSections")
    .withIndex("by_conversation_and_position", (q) =>
      q.eq("conversationId", conversationId)
    )
    .collect()
}

async function ensureStoredDiscussionSections(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  conversation: Doc<"conversations">,
  createdByUserId?: Id<"users">
) {
  if (conversation.slug === "general") {
    return []
  }

  const existing = await listStoredDiscussionSections(ctx, conversation._id)

  if (existing.length) {
    return existing
  }

  const now = Date.now()

  for (const [position, section] of defaultDiscussionSectionSeed.entries()) {
    await ctx.db.insert("clubDiscussionSections", {
      workspaceId,
      conversationId: conversation._id,
      slug: section.slug,
      name: section.name,
      description: section.description,
      position,
      createdAt: now + position,
      createdByUserId,
    })
  }

  return await listStoredDiscussionSections(ctx, conversation._id)
}

async function listDiscussionSectionSnapshots(
  ctx: ReadCtx | MutationCtx,
  conversation: Doc<"conversations">
): Promise<DiscussionSectionSnapshot[]> {
  if (isDirectMessageConversation(conversation)) {
    return [
      {
        id: null,
        slug: directMessageDiscussionSection.slug,
        name: directMessageDiscussionSection.name,
        description: directMessageDiscussionSection.description,
        position: 0,
      },
    ]
  }

  if (conversation.slug === "general") {
    return [
      {
        id: null,
        slug: campusFeedDiscussionSection.slug,
        name: campusFeedDiscussionSection.name,
        description: campusFeedDiscussionSection.description,
        position: 0,
      },
    ]
  }

  const storedSections = await listStoredDiscussionSections(ctx, conversation._id)

  if (storedSections.length) {
    return storedSections.map((section) => ({
      id: String(section._id),
      slug: section.slug,
      name: section.name,
      description: section.description ?? null,
      position: section.position,
    }))
  }

  return defaultDiscussionSectionSeed.map((section, index) => ({
    id: null,
    slug: section.slug,
    name: section.name,
    description: section.description,
    position: index,
  }))
}

async function createUniqueDiscussionSectionSlug(
  ctx: ReadCtx | MutationCtx,
  conversationId: Id<"conversations">,
  name: string
) {
  const reserved = new Set<string>(
    defaultDiscussionSectionSeed.map((section) => section.slug)
  )
  const storedSections = await listStoredDiscussionSections(ctx, conversationId)

  for (const section of storedSections) {
    reserved.add(section.slug)
  }

  const base = createDiscussionSectionSlug(name) || "section"
  let slug = base
  let suffix = 2

  while (reserved.has(slug)) {
    slug = `${base}-${suffix}`.slice(0, 32)
    suffix += 1
  }

  return slug
}

function selectDiscussionSection(
  sections: DiscussionSectionSnapshot[],
  requestedSlug?: string
) {
  return (
    sections.find((section) => section.slug === requestedSlug) ??
    sections.find((section) => section.slug === "general") ??
    sections[0] ??
    null
  )
}

async function upsertConversationMembership(
  ctx: MutationCtx,
  {
    workspaceId,
    conversation,
    userId,
    role = "member",
  }: {
    workspaceId: Id<"workspaces">
    conversation: Doc<"conversations">
    userId: Id<"users">
    role?: ClubRole
  }
) {
  const existing = await getConversationMembership(ctx, conversation._id, userId)

  if (existing) {
    await ctx.db.patch(existing._id, {
      role,
    })
    return (await ctx.db.get(existing._id))!
  }

  const membershipId = await ctx.db.insert("conversationMembers", {
    workspaceId,
    conversationId: conversation._id,
    userId,
    role,
    joinedAt: Date.now(),
  })

  return (await ctx.db.get(membershipId))!
}

async function countOwners(
  ctx: ReadCtx | MutationCtx,
  conversation: Doc<"conversations">
) {
  const memberships = await listConversationMembershipDocs(ctx, conversation._id)

  return memberships.filter(
    (membership) => resolveConversationMemberRole(conversation, membership) === "owner"
  ).length
}

function canManageConversation({
  kind,
  workspaceRole,
  clubRole,
}: {
  kind: "channel" | "dm"
  workspaceRole: "admin" | "member"
  clubRole: ClubRole | null
}) {
  if (kind === "dm") {
    return false
  }

  return workspaceRole === "admin" || clubRole === "owner" || clubRole === "officer"
}

function canEditConversationRoles({
  kind,
  workspaceRole,
  clubRole,
}: {
  kind: "channel" | "dm"
  workspaceRole: "admin" | "member"
  clubRole: ClubRole | null
}) {
  if (kind === "dm") {
    return false
  }

  return workspaceRole === "admin" || clubRole === "owner"
}

function membershipStateForViewer({
  kind,
  access,
  workspaceRole,
  clubRole,
  hasPendingRequest,
}: {
  kind: "channel" | "dm"
  access: ChannelAccess
  workspaceRole: "admin" | "member"
  clubRole: ClubRole | null
  hasPendingRequest: boolean
}): MembershipState {
  if (kind === "dm") {
    return clubRole ? "member" : "notMember"
  }

  if (workspaceRole === "admin") {
    return "admin"
  }

  if (clubRole === "owner") {
    return "owner"
  }

  if (clubRole === "officer") {
    return "officer"
  }

  if (clubRole === "member") {
    return "member"
  }

  if (access === "public") {
    return "public"
  }

  if (hasPendingRequest) {
    return "pending"
  }

  return "notMember"
}

function canAccessConversation({
  kind,
  access,
  workspaceRole,
  clubRole,
}: {
  kind: "channel" | "dm"
  access: ChannelAccess
  workspaceRole: "admin" | "member"
  clubRole: ClubRole | null
}) {
  if (kind === "dm") {
    return clubRole !== null
  }

  return access === "public" || workspaceRole === "admin" || clubRole !== null
}

async function getConversationReadState(
  ctx: ReadCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("conversationReads")
    .withIndex("by_conversation_and_user", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId)
    )
    .unique()
}

async function findDirectMessageConversation(
  ctx: ReadCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  leftUserId: Id<"users">,
  rightUserId: Id<"users">
) {
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_workspace_and_slug", (q) => q.eq("workspaceId", workspaceId))
    .collect()
  const directMessages = conversations.filter((conversation) => conversation.kind === "dm")

  for (const conversation of directMessages) {
    const members = await listConversationMembershipDocs(ctx, conversation._id)

    if (
      members.length === 2 &&
      members.some((membership) => membership.userId === leftUserId) &&
      members.some((membership) => membership.userId === rightUserId)
    ) {
      return conversation
    }
  }

  return null
}

async function listMentionableUsers(
  ctx: ReadCtx | MutationCtx,
  workspace: Doc<"workspaces">,
  conversation: Doc<"conversations">
) {
  if (conversation.slug === "general") {
    const workspaceMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_role", (q) => q.eq("workspaceId", workspace._id))
      .collect()

    return await Promise.all(
      workspaceMembers.map(async (member) => ({
        userId: member.userId,
        user: await ctx.db.get(member.userId),
      }))
    )
  }

  const memberships = await listConversationMembershipDocs(ctx, conversation._id)

  return await Promise.all(
    memberships.map(async (membership) => ({
      userId: membership.userId,
      user: await ctx.db.get(membership.userId),
    }))
  )
}

async function findMentionedUserIds(
  ctx: ReadCtx | MutationCtx,
  workspace: Doc<"workspaces">,
  conversation: Doc<"conversations">,
  body: string,
  excludedUserId: Id<"users">
) {
  const mentionMatches = Array.from(body.matchAll(/@([a-z0-9._-]+)/gi))
  const mentionTokens = new Set(
    mentionMatches
      .map((match) => normalizeMentionToken(match[1] ?? ""))
      .filter(Boolean)
  )

  if (mentionTokens.size === 0) {
    return []
  }

  const candidates = await listMentionableUsers(ctx, workspace, conversation)
  const mentioned = new Set<Id<"users">>()

  for (const candidate of candidates) {
    if (!candidate.user || candidate.userId === excludedUserId) {
      continue
    }

    const candidateTokens = buildMentionTokens(candidate.user)

    for (const token of mentionTokens) {
      if (candidateTokens.has(token)) {
        mentioned.add(candidate.userId)
      }
    }
  }

  return Array.from(mentioned)
}

async function listConversationMembers(
  ctx: ReadCtx,
  conversation: Doc<"conversations">,
  currentUserId?: Id<"users">
) {
  const memberships = await listConversationMembershipDocs(ctx, conversation._id)

  const members = await Promise.all(
    memberships.map(async (membership) => {
      const user = await ctx.db.get(membership.userId)

      return {
        id: String(membership.userId),
        name: getDisplayNameFromUser(user),
        imageUrl: user?.imageUrl ?? null,
        role: resolveConversationMemberRole(conversation, membership),
        joinedAt: membership.joinedAt,
        isCurrentUser: currentUserId === membership.userId,
      }
    })
  )

  members.sort((left, right) => {
    const rank = { owner: 0, officer: 1, member: 2 }

    if (rank[left.role] !== rank[right.role]) {
      return rank[left.role] - rank[right.role]
    }

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
        name: getDisplayNameFromUser(user),
        imageUrl: user?.imageUrl ?? null,
        createdAt: request.createdAt,
      }
    })
  )

  pending.sort((left, right) => left.createdAt - right.createdAt)
  return pending
}

async function requireClubEvent(
  ctx: ReadCtx | MutationCtx,
  eventId: Id<"clubEvents">
): Promise<Doc<"clubEvents">> {
  const event = await ctx.db.get(eventId)

  if (!event) {
    throw new Error("Club event not found.")
  }

  return event
}

async function requireClubPoll(
  ctx: ReadCtx | MutationCtx,
  pollId: Id<"clubPolls">
): Promise<Doc<"clubPolls">> {
  const poll = await ctx.db.get(pollId)

  if (!poll) {
    throw new Error("Club poll not found.")
  }

  return poll
}

async function generateUniqueTicketCode(
  ctx: ReadCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let nextCode = "EV"

    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * ticketCodeAlphabet.length)
      nextCode += ticketCodeAlphabet[randomIndex]
    }

    const existing = await ctx.db
      .query("clubEventTickets")
      .withIndex("by_workspace_and_code", (q) =>
        q.eq("workspaceId", workspaceId).eq("code", nextCode)
      )
      .unique()

    if (!existing) {
      return nextCode
    }
  }

  throw new Error("Unable to generate a unique event ticket right now.")
}

async function requireConversationManager(
  ctx: MutationCtx,
  workspace: Doc<"workspaces">,
  conversation: Doc<"conversations">
) {
  const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
  const membership = await getConversationMembership(ctx, conversation._id, user._id)
  const clubRole = membership
    ? resolveConversationMemberRole(conversation, membership)
    : null

  if (!canManageConversation({ kind: conversation.kind, workspaceRole, clubRole })) {
    throw new Error("Only club managers can perform this action.")
  }

  return {
    user,
    workspaceRole,
    clubRole,
  }
}

async function requireConversationRoleEditor(
  ctx: MutationCtx,
  workspace: Doc<"workspaces">,
  conversation: Doc<"conversations">
) {
  const manager = await requireConversationManager(ctx, workspace, conversation)

  if (
    !canEditConversationRoles({
      kind: conversation.kind,
      workspaceRole: manager.workspaceRole,
      clubRole: manager.clubRole,
    })
  ) {
    throw new Error("Only club owners can change club roles.")
  }

  return manager
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

    const { currentUser, role: workspaceRole } = await getWorkspaceViewer(ctx, workspace)
    const workspaceMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_role", (q) => q.eq("workspaceId", workspace._id))
      .collect()
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_workspace_and_slug", (q) => q.eq("workspaceId", workspace._id))
      .collect()
    const channels = conversations.filter((conversation) => conversation.kind === "channel")
    const directMessages = conversations.filter((conversation) => conversation.kind === "dm")
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace_and_created_at", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()
    const readStates =
      currentUser !== null
        ? await ctx.db
            .query("conversationReads")
            .withIndex("by_user_and_workspace", (q) =>
              q.eq("userId", currentUser._id).eq("workspaceId", workspace._id)
            )
            .collect()
        : []
    const readAtByConversationId = new Map(
      readStates.map((readState) => [String(readState.conversationId), readState.lastReadAt])
    )
    const statsByConversationId = new Map<
      string,
      {
        count: number
        lastMessageAt: number | null
        unreadCount: number
        preview: string | null
      }
    >()

    for (const message of messages) {
      const key = String(message.conversationId)
      const existing = statsByConversationId.get(key)
      const readAt = readAtByConversationId.get(key) ?? 0
      const unreadCount =
        currentUser && message.authorId !== currentUser._id && message.createdAt > readAt
          ? 1
          : 0

      statsByConversationId.set(key, {
        count: (existing?.count ?? 0) + 1,
        lastMessageAt: Math.max(existing?.lastMessageAt ?? 0, message.createdAt),
        unreadCount: (existing?.unreadCount ?? 0) + unreadCount,
        preview: message.body,
      })
    }

    const channelsWithMeta = await Promise.all(
      channels.map(async (channel) => {
        const access = resolveConversationAccess(channel)
        const conversationMembers = await listConversationMembershipDocs(ctx, channel._id)
        const membership = currentUser
          ? await getConversationMembership(ctx, channel._id, currentUser._id)
          : null
        const joinRequest = currentUser
          ? await getConversationJoinRequest(ctx, channel._id, currentUser._id)
          : null
        const stats = statsByConversationId.get(String(channel._id))
        const viewerClubRole = membership
          ? resolveConversationMemberRole(channel, membership)
          : null

        return {
          id: String(channel._id),
          slug: channel.slug,
          name: channel.name,
          description: channel.description,
          category: categoryForConversation(channel),
          isGeneral: channel.slug === "general",
          access,
          memberCount:
            channel.slug === "general"
              ? workspaceMembers.length
              : conversationMembers.length,
          messageCount: stats?.count ?? 0,
          lastMessageAt: stats?.lastMessageAt ?? channel.createdAt ?? null,
          membershipState: membershipStateForViewer({
            kind: channel.kind,
            access,
            workspaceRole,
            clubRole: viewerClubRole,
            hasPendingRequest: joinRequest?.status === "pending",
          }),
          viewerClubRole,
          canManage: canManageConversation({
            kind: channel.kind,
            workspaceRole,
            clubRole: viewerClubRole,
          }),
          canOpen: canAccessConversation({
            kind: channel.kind,
            access,
            workspaceRole,
            clubRole: viewerClubRole,
          }),
          canJoin:
            channel.slug !== "general" &&
            access === "public" &&
            workspaceRole !== "admin" &&
            viewerClubRole === null,
          canRequestToJoin:
            access === "members" &&
            workspaceRole !== "admin" &&
            !viewerClubRole &&
            joinRequest?.status !== "pending",
          unreadCount: stats?.unreadCount ?? 0,
        }
      })
    )

    const directMessagesWithMeta =
      currentUser === null
        ? []
        : (
            await Promise.all(
              directMessages.map(async (conversation) => {
                const membership = await getConversationMembership(
                  ctx,
                  conversation._id,
                  currentUser._id
                )

                if (!membership) {
                  return null
                }

                const members = await listConversationMembershipDocs(ctx, conversation._id)
                const otherMembership =
                  members.find((entry) => entry.userId !== currentUser._id) ?? membership
                const otherUser = await ctx.db.get(otherMembership.userId)
                const stats = statsByConversationId.get(String(conversation._id))

                return {
                  id: String(conversation._id),
                  slug: conversation.slug,
                  name: getDisplayNameFromUser(otherUser),
                  imageUrl: otherUser?.imageUrl ?? null,
                  preview: stats?.preview ?? "No messages yet",
                  lastMessageAt: stats?.lastMessageAt ?? conversation.createdAt ?? null,
                  unreadCount: stats?.unreadCount ?? 0,
                }
              })
            )
          )
            .filter((conversation) => conversation !== null)
            .sort((left, right) => (right.lastMessageAt ?? 0) - (left.lastMessageAt ?? 0))

    channelsWithMeta.sort((left, right) => {
      const leftLastMessageAt = left.lastMessageAt ?? 0
      const rightLastMessageAt = right.lastMessageAt ?? 0

      return rightLastMessageAt - leftLastMessageAt
    })

    return {
      currentRole: workspaceRole,
      channels: channelsWithMeta,
      directMessages: directMessagesWithMeta,
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

    const { currentUser, role: workspaceRole } = await getWorkspaceViewer(ctx, workspace)
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
    const viewerClubRole = membership
      ? resolveConversationMemberRole(convo, membership)
      : null
    const canManage = canManageConversation({
      kind: convo.kind,
      workspaceRole,
      clubRole: viewerClubRole,
    })
    const canEditRoles =
      convo.kind === "channel" &&
      access === "members" &&
      canEditConversationRoles({
        kind: convo.kind,
        workspaceRole,
        clubRole: viewerClubRole,
      })
    const canViewMessages = canAccessConversation({
      kind: convo.kind,
      access,
      workspaceRole,
      clubRole: viewerClubRole,
    })
    const discussionSections = await listDiscussionSectionSnapshots(ctx, convo)
    const sectionStats = new Map<string, { messageCount: number; lastMessageAt: number | null }>()

    if (canViewMessages) {
      const allMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_and_created_at", (q) =>
          q.eq("conversationId", convo._id)
        )
        .collect()

      for (const message of allMessages) {
        const fallbackSectionSlug = message.sectionId
          ? null
          : convo.slug === "general"
            ? campusFeedDiscussionSection.slug
            : "general"
        const matchedSection = message.sectionId
          ? discussionSections.find((section) => section.id === String(message.sectionId))
          : discussionSections.find((section) => section.slug === fallbackSectionSlug)

        if (!matchedSection) {
          continue
        }

        const current = sectionStats.get(matchedSection.slug)

        sectionStats.set(matchedSection.slug, {
          messageCount: (current?.messageCount ?? 0) + 1,
          lastMessageAt: Math.max(current?.lastMessageAt ?? 0, message.createdAt),
        })
      }
    }
    const members =
      convo.slug === "general"
        ? []
        : await listConversationMembers(ctx, convo, currentUser?._id)
    const pendingRequests =
      canManage && access === "members"
        ? await listPendingJoinRequests(ctx, convo._id)
        : []

    return {
      slug: convo.slug,
      name: convo.name,
      description: convo.description,
      category: categoryForConversation(convo),
      isGeneral: convo.slug === "general",
      kind: convo.kind,
      access,
      canManage,
      canEditRoles,
      viewerClubRole,
      memberCount: convo.slug === "general" ? null : members.length,
      viewerMembershipState: membershipStateForViewer({
        kind: convo.kind,
        access,
        workspaceRole,
        clubRole: viewerClubRole,
        hasPendingRequest: joinRequest?.status === "pending",
      }),
      canViewMessages,
      canPostMessages: canViewMessages,
      canJoin:
        convo.kind === "channel" &&
        convo.slug !== "general" &&
        access === "public" &&
        workspaceRole !== "admin" &&
        viewerClubRole === null,
      canRequestToJoin:
        convo.kind === "channel" &&
        access === "members" &&
        workspaceRole !== "admin" &&
        !viewerClubRole &&
        joinRequest?.status !== "pending",
      canLeave:
        convo.kind === "channel" &&
        convo.slug !== "general" &&
        viewerClubRole !== null &&
        (access === "public" || workspaceRole !== "admin"),
      discussionSections: discussionSections.map((section) => ({
        id: section.id,
        slug: section.slug,
        name: section.name,
        description: section.description,
        messageCount: sectionStats.get(section.slug)?.messageCount ?? 0,
        lastMessageAt: sectionStats.get(section.slug)?.lastMessageAt ?? null,
      })),
      members,
      pendingRequests,
    }
  },
})

export const listMessages = queryGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    sectionSlug: v.optional(v.string()),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return []
    }

    const { currentUser, role: workspaceRole } = await getWorkspaceViewer(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      return []
    }

    const membership = currentUser
      ? await getConversationMembership(ctx, convo._id, currentUser._id)
      : null
    const clubRole = membership
      ? resolveConversationMemberRole(convo, membership)
      : null

    if (
      !canAccessConversation({
        kind: convo.kind,
        access: resolveConversationAccess(convo),
        workspaceRole,
        clubRole,
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
    const discussionSections = await listDiscussionSectionSnapshots(ctx, convo)
    const selectedSection = selectDiscussionSection(discussionSections, args.sectionSlug)

    if (!selectedSection) {
      return []
    }

    return await Promise.all(
      messages
        .filter((message) => {
          if (!message.sectionId) {
            return selectedSection.slug === "general" || selectedSection.slug === "feed"
          }

          return String(message.sectionId) === selectedSection.id
        })
        .map(async (message) => {
        const author = await ctx.db.get(message.authorId)

        return {
          id: String(message._id),
          body: message.body,
          createdAt: message.createdAt,
          author: {
            id: String(message.authorId),
            name: getDisplayNameFromUser(author),
            imageUrl: author?.imageUrl ?? null,
            isCurrentUser: author?.externalId === identity.subject,
          },
        }
        })
    )
  },
})

export const clubOperations = queryGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    sectionSlug: v.optional(v.string()),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    const { currentUser, role: workspaceRole } = await getWorkspaceViewer(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      return null
    }

    const access = resolveConversationAccess(convo)
    const membership = currentUser
      ? await getConversationMembership(ctx, convo._id, currentUser._id)
      : null
    const viewerClubRole = membership
      ? resolveConversationMemberRole(convo, membership)
      : null
    const canManage = canManageConversation({
      kind: convo.kind,
      workspaceRole,
      clubRole: viewerClubRole,
    })
    const canParticipate = canAccessConversation({
      kind: convo.kind,
      access,
      workspaceRole,
      clubRole: viewerClubRole,
    })
    if (convo.kind === "dm") {
      return {
        canManage: false,
        canParticipate,
        clubName: convo.name,
        workspaceName: workspace.name,
        events: [],
        polls: [],
      }
    }
    const discussionSections = await listDiscussionSectionSnapshots(ctx, convo)
    const selectedSection = args.sectionSlug
      ? selectDiscussionSection(discussionSections, args.sectionSlug)
      : null
    const events = await ctx.db
      .query("clubEvents")
      .withIndex("by_conversation_and_created_at", (q) =>
        q.eq("conversationId", convo._id)
      )
      .collect()
    const polls = await ctx.db
      .query("clubPolls")
      .withIndex("by_conversation_and_created_at", (q) =>
        q.eq("conversationId", convo._id)
      )
      .collect()
    const filteredPolls = selectedSection
      ? polls.filter(
          (poll) =>
            !poll.sectionId ||
            (selectedSection.id !== null && String(poll.sectionId) === selectedSection.id)
        )
      : polls

    const eventSnapshots = await Promise.all(
      events.map(async (event) => {
        const [createdByUser, tickets] = await Promise.all([
          ctx.db.get(event.createdByUserId),
          ctx.db
            .query("clubEventTickets")
            .withIndex("by_event_and_created_at", (q) => q.eq("eventId", event._id))
            .collect(),
        ])

        const viewerTicket = currentUser
          ? tickets.find((ticket) => ticket.userId === currentUser._id) ?? null
          : null
        const attendees = canManage
          ? (
              await Promise.all(
                tickets.map(async (ticket) => {
                  const [user, checkedInByUser] = await Promise.all([
                    ctx.db.get(ticket.userId),
                    ticket.checkedInByUserId
                      ? ctx.db.get(ticket.checkedInByUserId)
                      : Promise.resolve(null),
                  ])

                  return {
                    ticketId: String(ticket._id),
                    userId: String(ticket.userId),
                    name: getDisplayNameFromUser(user),
                    email: user?.email ?? null,
                    code: ticket.code,
                    createdAt: ticket.createdAt,
                    checkedInAt: ticket.checkedInAt ?? null,
                    checkedInByName: checkedInByUser?.name ?? null,
                  }
                })
              )
            ).sort((left, right) => {
              const leftPending = left.checkedInAt === null
              const rightPending = right.checkedInAt === null

              if (leftPending !== rightPending) {
                return leftPending ? -1 : 1
              }

              return left.name.localeCompare(right.name)
            })
          : []
        const checkedInCount = tickets.filter((ticket) => ticket.checkedInAt).length

        return {
          id: String(event._id),
          title: event.title,
          summary: event.summary ?? null,
          date: event.date,
          time: event.time,
          location: event.location,
          status: event.status,
          createdAt: event.createdAt,
          createdByName: getDisplayNameFromUser(createdByUser),
          ticketCount: tickets.length,
          checkedInCount,
          viewerTicket: viewerTicket
            ? {
                id: String(viewerTicket._id),
                code: viewerTicket.code,
                createdAt: viewerTicket.createdAt,
                checkedInAt: viewerTicket.checkedInAt ?? null,
                attendeeName: getDisplayNameFromUser(currentUser),
                attendeeEmail: currentUser?.email ?? null,
                organizationName: workspace.name,
                clubName: convo.name,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                eventLocation: event.location,
                qrValue: JSON.stringify({
                  type: "campushive-club-ticket",
                  workspaceSlug: workspace.slug,
                  clubSlug: convo.slug,
                  eventId: String(event._id),
                  ticketId: String(viewerTicket._id),
                  code: viewerTicket.code,
                }),
              }
            : null,
          attendees,
        }
      })
    )

    eventSnapshots.sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "open" ? -1 : 1
      }

      if (left.date !== right.date) {
        return left.date.localeCompare(right.date)
      }

      return left.time.localeCompare(right.time)
    })

    const pollSnapshots = await Promise.all(
      filteredPolls.map(async (poll) => {
        const [createdByUser, votes] = await Promise.all([
          ctx.db.get(poll.createdByUserId),
          ctx.db
            .query("clubPollVotes")
            .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
            .collect(),
        ])

        const voteCountByOptionId = new Map<string, number>()
        let viewerVoteOptionId: string | null = null

        votes.forEach((vote) => {
          voteCountByOptionId.set(
            vote.optionId,
            (voteCountByOptionId.get(vote.optionId) ?? 0) + 1
          )

          if (currentUser && vote.userId === currentUser._id) {
            viewerVoteOptionId = vote.optionId
          }
        })

        const totalVotes = votes.length

        return {
          id: String(poll._id),
          question: poll.question,
          description: poll.description ?? null,
          status: poll.status,
          totalVotes,
          createdAt: poll.createdAt,
          createdByName: getDisplayNameFromUser(createdByUser),
          viewerVoteOptionId,
          options: poll.options.map((option) => {
            const votesForOption = voteCountByOptionId.get(option.id) ?? 0

            return {
              id: option.id,
              label: option.label,
              votes: votesForOption,
              percentage:
                totalVotes === 0 ? 0 : Math.round((votesForOption / totalVotes) * 100),
            }
          }),
        }
      })
    )

    pollSnapshots.sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "open" ? -1 : 1
      }

      return right.createdAt - left.createdAt
    })

    return {
      canManage,
      canParticipate,
      clubName: convo.name,
      workspaceName: workspace.name,
      events: eventSnapshots,
      polls: pollSnapshots,
    }
  },
})

export const createClubEvent = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (convo.slug === "general") {
      throw new Error("Campus Feed does not support custom discussion sections.")
    }

    const manager = await requireConversationManager(ctx, workspace, convo)
    const title = normalizeChannelName(args.title)
    const summary = normalizeOptionalString(args.summary)
    const time = args.time.trim()
    const location = args.location.trim()

    if (title.length < 3) {
      throw new Error("Event title must be at least 3 characters long.")
    }

    if (title.length > 90) {
      throw new Error("Event title must be 90 characters or fewer.")
    }

    if (summary && summary.length > 240) {
      throw new Error("Event summary must be 240 characters or fewer.")
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Use a valid event date.")
    }

    if (time.length < 2 || time.length > 40) {
      throw new Error("Event time must be between 2 and 40 characters.")
    }

    if (location.length < 2 || location.length > 80) {
      throw new Error("Event location must be between 2 and 80 characters.")
    }

    const eventId = await ctx.db.insert("clubEvents", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      title,
      summary,
      date: args.date,
      time,
      location,
      status: "open",
      createdAt: Date.now(),
      createdByUserId: manager.user._id,
    })

    const memberships = await listConversationMembershipDocs(ctx, convo._id)

    await createNotifications(ctx, {
      workspaceId: workspace._id,
      recipientUserIds: memberships.map((membership) => membership.userId),
      kind: "clubEvent",
      title: `New ${convo.name} event: ${title}`,
      body: `${args.date} · ${time} · ${location}`,
      route: `/channels/${convo.slug}`,
      actorUserId: manager.user._id,
      conversationId: convo._id,
      eventId,
    })

    return {
      eventId: String(eventId),
    }
  },
})

export const joinClubEvent = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    eventId: v.id("clubEvents"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const access = resolveConversationAccess(convo)
    const membership = await getConversationMembership(ctx, convo._id, user._id)
    const clubRole = membership ? resolveConversationMemberRole(convo, membership) : null

    if (!canAccessConversation({ kind: convo.kind, access, workspaceRole, clubRole })) {
      throw new Error("Join this club space before claiming an event ticket.")
    }

    const event = await requireClubEvent(ctx, args.eventId)

    if (event.workspaceId !== workspace._id || event.conversationId !== convo._id) {
      throw new Error("This event does not belong to the selected club.")
    }

    if (event.status !== "open") {
      throw new Error("This event is no longer issuing tickets.")
    }

    const existingTicket = await ctx.db
      .query("clubEventTickets")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", event._id).eq("userId", user._id)
      )
      .unique()

    if (existingTicket) {
      return {
        ticketId: String(existingTicket._id),
        code: existingTicket.code,
      }
    }

    const code = await generateUniqueTicketCode(ctx, workspace._id)
    const ticketId = await ctx.db.insert("clubEventTickets", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      eventId: event._id,
      userId: user._id,
      code,
      createdAt: Date.now(),
    })

    return {
      ticketId: String(ticketId),
      code,
    }
  },
})

export const checkInClubTicket = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    ticketId: v.id("clubEventTickets"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const manager = await requireConversationManager(ctx, workspace, convo)
    const ticket = await ctx.db.get(args.ticketId)

    if (!ticket) {
      throw new Error("Event ticket not found.")
    }

    if (ticket.workspaceId !== workspace._id || ticket.conversationId !== convo._id) {
      throw new Error("This ticket does not belong to the selected club.")
    }

    if (ticket.checkedInAt) {
      throw new Error("This ticket has already been checked in.")
    }

    await ctx.db.patch(ticket._id, {
      checkedInAt: Date.now(),
      checkedInByUserId: manager.user._id,
    })

    return null
  },
})

export const resetClubTicket = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    ticketId: v.id("clubEventTickets"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    await requireConversationManager(ctx, workspace, convo)
    const ticket = await ctx.db.get(args.ticketId)

    if (!ticket) {
      throw new Error("Event ticket not found.")
    }

    if (ticket.workspaceId !== workspace._id || ticket.conversationId !== convo._id) {
      throw new Error("This ticket does not belong to the selected club.")
    }

    await ctx.db.patch(ticket._id, {
      checkedInAt: undefined,
      checkedInByUserId: undefined,
    })

    return null
  },
})

export const createClubPoll = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    sectionSlug: v.optional(v.string()),
    question: v.string(),
    description: v.optional(v.string()),
    options: v.array(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const manager = await requireConversationManager(ctx, workspace, convo)
    const discussionSections =
      convo.slug === "general"
        ? []
        : await ensureStoredDiscussionSections(ctx, workspace._id, convo, manager.user._id)
    const selectedSection =
      convo.slug === "general"
        ? null
        : discussionSections.find((section) => section.slug === args.sectionSlug) ??
          discussionSections.find((section) => section.slug === "general") ??
          discussionSections[0] ??
          null
    const question = normalizeChannelName(args.question)
    const description = normalizeOptionalString(args.description)
    const options = normalizePollOptions(args.options)

    if (question.length < 5) {
      throw new Error("Poll question must be at least 5 characters long.")
    }

    if (question.length > 140) {
      throw new Error("Poll question must be 140 characters or fewer.")
    }

    if (description && description.length > 240) {
      throw new Error("Poll description must be 240 characters or fewer.")
    }

    const pollId = await ctx.db.insert("clubPolls", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      sectionId: selectedSection?._id,
      question,
      description,
      status: "open",
      options,
      createdAt: Date.now(),
      createdByUserId: manager.user._id,
    })

    return {
      pollId: String(pollId),
    }
  },
})

export const voteOnClubPoll = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    pollId: v.id("clubPolls"),
    optionId: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const access = resolveConversationAccess(convo)
    const membership = await getConversationMembership(ctx, convo._id, user._id)
    const clubRole = membership ? resolveConversationMemberRole(convo, membership) : null

    if (!canAccessConversation({ kind: convo.kind, access, workspaceRole, clubRole })) {
      throw new Error("Join this club space before voting in club polls.")
    }

    const poll = await requireClubPoll(ctx, args.pollId)

    if (poll.workspaceId !== workspace._id || poll.conversationId !== convo._id) {
      throw new Error("This poll does not belong to the selected club.")
    }

    if (poll.status !== "open") {
      throw new Error("This poll is already closed.")
    }

    if (!poll.options.some((option) => option.id === args.optionId)) {
      throw new Error("Pick one of the available poll options.")
    }

    const existingVote = await ctx.db
      .query("clubPollVotes")
      .withIndex("by_poll_and_user", (q) =>
        q.eq("pollId", poll._id).eq("userId", user._id)
      )
      .unique()

    const now = Date.now()

    if (existingVote) {
      if (existingVote.optionId === args.optionId) {
        await ctx.db.delete(existingVote._id)
        return null
      }

      await ctx.db.patch(existingVote._id, {
        optionId: args.optionId,
        updatedAt: now,
      })
      return null
    }

    await ctx.db.insert("clubPollVotes", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      pollId: poll._id,
      userId: user._id,
      optionId: args.optionId,
      createdAt: now,
      updatedAt: now,
    })

    return null
  },
})

export const setClubPollStatus = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    pollId: v.id("clubPolls"),
    status: liveStatus,
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    await requireConversationManager(ctx, workspace, convo)
    const poll = await requireClubPoll(ctx, args.pollId)

    if (poll.workspaceId !== workspace._id || poll.conversationId !== convo._id) {
      throw new Error("This poll does not belong to the selected club.")
    }

    await ctx.db.patch(poll._id, {
      status: args.status,
    })

    return null
  },
})

export const createChannel = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    access: v.optional(v.union(v.literal("public"), v.literal("members"))),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    assertWorkspaceAdmin(workspaceRole)

    const name = normalizeChannelName(args.name)
    const description = args.description?.trim() ?? ""
    const category = normalizeClubCategory(args.category)
    const access = args.access ?? "members"

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
      category,
      kind: "channel",
      access,
      createdByUserId: user._id,
      createdAt: Date.now(),
    })

    const conversation = (await ctx.db.get(conversationId))!

    await upsertConversationMembership(ctx, {
      workspaceId: workspace._id,
      conversation,
      userId: user._id,
      role: "owner",
    })

    await ensureStoredDiscussionSections(ctx, workspace._id, conversation, user._id)

    return {
      channelId: String(conversationId),
      slug,
    }
  },
})

export const createDiscussionSection = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
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

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const manager = await requireConversationManager(ctx, workspace, convo)
    const name = normalizeDiscussionSectionName(args.name)
    const description = normalizeOptionalString(args.description)

    if (name.length < 2) {
      throw new Error("Section name must be at least 2 characters long.")
    }

    if (name.length > 40) {
      throw new Error("Section name must be 40 characters or fewer.")
    }

    if (description && description.length > 140) {
      throw new Error("Section description must be 140 characters or fewer.")
    }

    const existingSections = await ensureStoredDiscussionSections(
      ctx,
      workspace._id,
      convo,
      manager.user._id
    )
    const slug = await createUniqueDiscussionSectionSlug(ctx, convo._id, name)
    const sectionId = await ctx.db.insert("clubDiscussionSections", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      slug,
      name,
      description,
      position: existingSections.length,
      createdAt: Date.now(),
      createdByUserId: manager.user._id,
    })

    return {
      sectionId: String(sectionId),
      slug,
    }
  },
})

export const joinOpenClub = mutationGeneric({
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

    const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (convo.slug === "general") {
      throw new Error("Campus Feed is already open to everyone.")
    }

    if (resolveConversationAccess(convo) !== "public") {
      throw new Error("This club needs an approval request instead of direct joining.")
    }

    if (workspaceRole === "admin") {
      throw new Error("College admins already have access to every club space.")
    }

    const existingMembership = await getConversationMembership(ctx, convo._id, user._id)

    if (existingMembership) {
      throw new Error("You already joined this club.")
    }

    await upsertConversationMembership(ctx, {
      workspaceId: workspace._id,
      conversation: convo,
      userId: user._id,
      role: "member",
    })

    return null
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

    const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("This club is open. Join it instantly instead of sending a request.")
    }

    if (workspaceRole === "admin") {
      throw new Error("College admins already have access to every club space.")
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

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("This open club does not use join requests.")
    }

    const manager = await requireConversationManager(ctx, workspace, convo)
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
      reviewedByUserId: manager.user._id,
    })

    if (args.approve) {
      await upsertConversationMembership(ctx, {
        workspaceId: workspace._id,
        conversation: convo,
        userId: args.userId,
        role: "member",
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

    const { role: workspaceRole, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (convo.slug === "general") {
      throw new Error("Campus Feed cannot be left.")
    }

    if (resolveConversationAccess(convo) === "members" && workspaceRole === "admin") {
      throw new Error("College admins keep access across all private club spaces.")
    }

    const membership = await getConversationMembership(ctx, convo._id, user._id)

    if (!membership) {
      throw new Error("You are not a member of this club space.")
    }

    const clubRole = resolveConversationMemberRole(convo, membership)

    if (clubRole === "owner" && (await countOwners(ctx, convo)) <= 1) {
      throw new Error("Assign another club owner before leaving this club.")
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

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("Open clubs do not use managed removals.")
    }

    const manager = await requireConversationManager(ctx, workspace, convo)
    const targetMembership = await getConversationMembership(ctx, convo._id, args.userId)

    if (!targetMembership) {
      throw new Error("That student is not a member of this club space.")
    }

    const targetRole = resolveConversationMemberRole(convo, targetMembership)

    if (
      targetRole === "owner" &&
      !canEditConversationRoles({
        kind: convo.kind,
        workspaceRole: manager.workspaceRole,
        clubRole: manager.clubRole,
      })
    ) {
      throw new Error("Only club owners can remove another owner.")
    }

    if (targetRole === "owner" && (await countOwners(ctx, convo)) <= 1) {
      throw new Error("This club needs at least one owner.")
    }

    await ctx.db.delete(targetMembership._id)
    return null
  },
})

export const setMemberRole = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("officer"), v.literal("member")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    if (resolveConversationAccess(convo) === "public") {
      throw new Error("Open clubs do not use managed club roles.")
    }

    const editor = await requireConversationRoleEditor(ctx, workspace, convo)
    const targetMembership = await getConversationMembership(ctx, convo._id, args.userId)

    if (!targetMembership) {
      throw new Error("That student is not a member of this club space.")
    }

    const currentRole = resolveConversationMemberRole(convo, targetMembership)

    if (
      currentRole === "owner" &&
      args.role !== "owner" &&
      (await countOwners(ctx, convo)) <= 1
    ) {
      throw new Error("This club needs at least one owner.")
    }

    if (
      editor.workspaceRole !== "admin" &&
      editor.user._id === targetMembership.userId &&
      currentRole === "owner" &&
      args.role !== "owner" &&
      (await countOwners(ctx, convo)) <= 1
    ) {
      throw new Error("Assign another owner before changing your role.")
    }

    await ctx.db.patch(targetMembership._id, {
      role: args.role,
    })

    return null
  },
})

export const sendMessage = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
    sectionSlug: v.optional(v.string()),
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

    const { user, role: workspaceRole } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      throw new Error("Club space not found.")
    }

    const membership = await getConversationMembership(ctx, convo._id, user._id)
    const clubRole = membership
      ? resolveConversationMemberRole(convo, membership)
      : null

    if (
      !canAccessConversation({
        kind: convo.kind,
        access: resolveConversationAccess(convo),
        workspaceRole,
        clubRole,
      })
    ) {
      throw new Error("Join this club space before posting in it.")
    }

    const discussionSections =
      convo.slug === "general" || convo.kind === "dm"
        ? []
        : await ensureStoredDiscussionSections(ctx, workspace._id, convo, user._id)
    const selectedSection =
      convo.slug === "general" || convo.kind === "dm"
        ? null
        : discussionSections.find((section) => section.slug === args.sectionSlug) ??
          discussionSections.find((section) => section.slug === "general") ??
          discussionSections[0] ??
          null

    if (convo.slug !== "general" && convo.kind !== "dm" && !selectedSection) {
      throw new Error("This club does not have a discussion section yet.")
    }

    await ctx.db.insert("messages", {
      workspaceId: workspace._id,
      conversationId: convo._id,
      sectionId: selectedSection?._id,
      authorId: user._id,
      body: trimmed,
      createdAt: Date.now(),
    })

    if (convo.kind === "dm") {
      const memberships = await listConversationMembershipDocs(ctx, convo._id)

    await createNotifications(ctx, {
      workspaceId: workspace._id,
      recipientUserIds: memberships.map((membership) => membership.userId),
      kind: "dm",
      title: `New message from ${getDisplayNameFromUser(user)}`,
      body: trimmed,
      route: `/messages/${convo.slug}`,
      actorUserId: user._id,
      conversationId: convo._id,
    })
    } else {
      const mentionedUserIds = await findMentionedUserIds(
        ctx,
        workspace,
        convo,
        trimmed,
        user._id
      )

      if (mentionedUserIds.length) {
        await createNotifications(ctx, {
          workspaceId: workspace._id,
          recipientUserIds: mentionedUserIds,
          kind: "mention",
          title: `${getDisplayNameFromUser(user)} mentioned you`,
          body: trimmed,
          route: selectedSection
            ? `/channels/${convo.slug}/${selectedSection.slug}`
            : `/channels/${convo.slug}`,
          actorUserId: user._id,
          conversationId: convo._id,
        })
      }
    }

    return null
  },
})

export const createDirectMessage = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace)

    if (user._id === args.userId) {
      throw new Error("Choose another member to start a direct message.")
    }

    const targetWorkspaceMembership = await getWorkspaceMember(
      ctx,
      workspace._id,
      args.userId
    )

    if (!targetWorkspaceMembership) {
      throw new Error("That member is not part of this campus space.")
    }

    const existingConversation = await findDirectMessageConversation(
      ctx,
      workspace._id,
      user._id,
      args.userId
    )

    if (existingConversation) {
      return {
        slug: existingConversation.slug,
      }
    }

    const targetUser = await ctx.db.get(args.userId)
    const slug = `dm-${[String(user._id), String(args.userId)].sort().join("-")}`
    const conversationId = await ctx.db.insert("conversations", {
      workspaceId: workspace._id,
      slug,
      name: getDisplayNameFromUser(targetUser),
      description: "Private conversation between workspace members.",
      category: "Direct message",
      kind: "dm",
      access: "members",
      createdByUserId: user._id,
      createdAt: Date.now(),
    })
    const conversation = (await ctx.db.get(conversationId))!

    await upsertConversationMembership(ctx, {
      workspaceId: workspace._id,
      conversation,
      userId: user._id,
      role: "member",
    })
    await upsertConversationMembership(ctx, {
      workspaceId: workspace._id,
      conversation,
      userId: args.userId,
      role: "member",
    })

    return {
      slug,
    }
  },
})

export const markConversationRead = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    slug: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    const { user, role: workspaceRole } = await syncCurrentWorkspaceMember(ctx, workspace)
    const convo = await findConversation(ctx, workspace._id, args.slug)

    if (!convo) {
      return null
    }

    const membership = await getConversationMembership(ctx, convo._id, user._id)
    const clubRole = membership ? resolveConversationMemberRole(convo, membership) : null

    if (
      !canAccessConversation({
        kind: convo.kind,
        access: resolveConversationAccess(convo),
        workspaceRole,
        clubRole,
      })
    ) {
      return null
    }

    const existingReadState = await getConversationReadState(ctx, convo._id, user._id)
    const lastReadAt = Date.now()

    if (existingReadState) {
      await ctx.db.patch(existingReadState._id, {
        lastReadAt,
      })
    } else {
      await ctx.db.insert("conversationReads", {
        workspaceId: workspace._id,
        conversationId: convo._id,
        userId: user._id,
        lastReadAt,
      })
    }

    return null
  },
})
