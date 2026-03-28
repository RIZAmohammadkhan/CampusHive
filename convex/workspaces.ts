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
import type { QueryCtx } from "./types"
import type { MutationCtx } from "./types"

export const bootstrap = mutationGeneric({
  args: {
    clerkOrgId: v.string(),
    slug: v.string(),
    name: v.string(),
    userName: v.optional(v.string()),
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
