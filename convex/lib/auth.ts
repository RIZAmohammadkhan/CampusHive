import type { UserIdentity } from "convex/server"

import type { Doc, Id, Insert, MutationCtx, ReadCtx } from "../types"

export type WorkspaceRole = "admin" | "member"

type ActiveOrganization = {
  id?: string
  slug?: string
  role?: string
}

function readStringClaim(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeWorkspaceRole(value: string | undefined): WorkspaceRole {
  const normalized = value?.toLowerCase()

  if (normalized?.includes("owner") || normalized?.includes("admin")) {
    return "admin"
  }

  return "member"
}

export async function requireIdentity(ctx: ReadCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("Not authenticated")
  }

  return identity
}

export function getActiveOrganization(identity: UserIdentity): ActiveOrganization {
  const organizationClaim = isRecord(identity.o) ? identity.o : undefined

  return {
    id: readStringClaim(organizationClaim?.id) ?? readStringClaim(identity.org_id),
    slug:
      readStringClaim(organizationClaim?.slg) ?? readStringClaim(identity.org_slug),
    role:
      readStringClaim(organizationClaim?.rol) ?? readStringClaim(identity.org_role),
  }
}

export function assertActiveOrganization(
  identity: UserIdentity,
  expected: {
    clerkOrgId?: string
    slug?: string
  }
) {
  const activeOrganization = getActiveOrganization(identity)

  if (!activeOrganization.id && !activeOrganization.slug) {
    throw new Error(
      "Convex auth is missing the active Clerk organization. Activate the Clerk Convex integration before using campus data."
    )
  }

  if (
    expected.clerkOrgId &&
    activeOrganization.id &&
    activeOrganization.id !== expected.clerkOrgId
  ) {
    throw new Error("Active Clerk organization does not match this campus space.")
  }

  if (
    expected.slug &&
    activeOrganization.slug &&
    activeOrganization.slug !== expected.slug
  ) {
    throw new Error("Active Clerk organization slug does not match this campus space.")
  }
}

export function getWorkspaceRoleFromIdentity(
  identity: UserIdentity
): WorkspaceRole {
  return normalizeWorkspaceRole(getActiveOrganization(identity).role)
}

export function isWorkspaceAdmin(role: WorkspaceRole) {
  return role === "admin"
}

export function assertWorkspaceAdmin(role: WorkspaceRole) {
  if (!isWorkspaceAdmin(role)) {
    throw new Error("Only institute admins can perform this action.")
  }
}

export async function getUserByExternalId(
  ctx: ReadCtx,
  externalId: string
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique()
}

export async function upsertUser(
  ctx: MutationCtx,
  {
    externalId,
    name,
    firstName,
    lastName,
    email,
    imageUrl,
    tokenIdentifier,
    isSeed,
  }: {
    externalId: string
    name: string
    firstName?: string
    lastName?: string
    email?: string
    imageUrl?: string
    tokenIdentifier?: string
    isSeed: boolean
  }
): Promise<Doc<"users">> {
  const existing = await getUserByExternalId(ctx, externalId)
  const patch: Insert<"users"> = {
    externalId,
    name,
    firstName,
    lastName,
    email,
    imageUrl,
    tokenIdentifier,
    isSeed,
  }

  if (existing) {
    await ctx.db.patch(existing._id, patch)
    return (await ctx.db.get(existing._id))!
  }

  const userId = await ctx.db.insert("users", patch)
  return (await ctx.db.get(userId))!
}

export async function getCurrentUser(ctx: ReadCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    return null
  }

  return await getUserByExternalId(ctx, identity.subject)
}

export async function getOrCreateCurrentUser(
  ctx: MutationCtx,
  profile?: {
    name?: string
    firstName?: string
    lastName?: string
    email?: string
    imageUrl?: string
  }
): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx)

  return await upsertUser(ctx, {
    externalId: identity.subject,
    name: profile?.name ?? identity.name ?? "Student member",
    firstName: profile?.firstName,
    lastName: profile?.lastName,
    email:
      profile?.email ??
      (typeof identity.email === "string" ? identity.email : undefined),
    imageUrl: profile?.imageUrl ?? identity.pictureUrl,
    tokenIdentifier: identity.tokenIdentifier,
    isSeed: false,
  })
}

export async function getWorkspaceMember(
  ctx: ReadCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
): Promise<Doc<"workspaceMembers"> | null> {
  return await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .unique()
}

export async function upsertWorkspaceMember(
  ctx: MutationCtx,
  {
    workspaceId,
    userId,
    role,
  }: {
    workspaceId: Id<"workspaces">
    userId: Id<"users">
    role: WorkspaceRole
  }
): Promise<Doc<"workspaceMembers">> {
  const existing = await getWorkspaceMember(ctx, workspaceId, userId)
  const now = Date.now()

  if (existing) {
    await ctx.db.patch(existing._id, {
      role,
      lastActiveAt: now,
    })
    return (await ctx.db.get(existing._id))!
  }

  const memberId = await ctx.db.insert("workspaceMembers", {
    workspaceId,
    userId,
    role,
    joinedAt: now,
    lastActiveAt: now,
  })

  return (await ctx.db.get(memberId))!
}

export async function getWorkspaceViewer(
  ctx: ReadCtx,
  workspace: Doc<"workspaces">
): Promise<{
  identity: UserIdentity
  currentUser: Doc<"users"> | null
  member: Doc<"workspaceMembers"> | null
  role: WorkspaceRole
}> {
  const identity = await requireIdentity(ctx)
  assertActiveOrganization(identity, {
    clerkOrgId: workspace.clerkOrgId,
    slug: workspace.slug,
  })

  const currentUser = await getUserByExternalId(ctx, identity.subject)
  const member = currentUser
    ? await getWorkspaceMember(ctx, workspace._id, currentUser._id)
    : null

  return {
    identity,
    currentUser,
    member,
    role: member?.role ?? getWorkspaceRoleFromIdentity(identity),
  }
}

export async function syncCurrentWorkspaceMember(
  ctx: MutationCtx,
  workspace: Doc<"workspaces">,
  profile?: {
    name?: string
    firstName?: string
    lastName?: string
    email?: string
    imageUrl?: string
  }
): Promise<{
  identity: UserIdentity
  user: Doc<"users">
  member: Doc<"workspaceMembers">
  role: WorkspaceRole
}> {
  const identity = await requireIdentity(ctx)
  assertActiveOrganization(identity, {
    clerkOrgId: workspace.clerkOrgId,
    slug: workspace.slug,
  })

  const user = await getOrCreateCurrentUser(ctx, profile)
  const role = getWorkspaceRoleFromIdentity(identity)
  const member = await upsertWorkspaceMember(ctx, {
    workspaceId: workspace._id,
    userId: user._id,
    role,
  })

  return {
    identity,
    user,
    member,
    role,
  }
}
