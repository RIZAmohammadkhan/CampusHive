import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  getDisplayNameFromUser,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import { getWorkspaceBySlug } from "./lib/workspaces"
import type { Doc, Id, MutationCtx, ReadCtx } from "./types"

export async function getActivePresenceEntries(
  ctx: ReadCtx,
  workspaceId: Id<"workspaces">
): Promise<Array<Doc<"presence">>> {
  const cutoff = Date.now() - 45_000

  return await ctx.db
    .query("presence")
    .withIndex("by_workspace_and_last_seen_at", (q) =>
      q.eq("workspaceId", workspaceId).gt("lastSeenAt", cutoff)
    )
    .collect()
}

function labelForRoute(route: string) {
  if (route === "/") return "Hub"
  if (route.startsWith("/messages")) return "Messages"
  if (route.startsWith("/channels")) return "Club spaces"
  if (route.startsWith("/people")) return "People"
  if (route.startsWith("/projects")) return "Tasks"
  if (route.startsWith("/calendar")) return "Events"
  return "Campus space"
}

export const heartbeat = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    route: v.string(),
    room: v.string(),
    userName: v.optional(v.string()),
    userFirstName: v.optional(v.string()),
    userLastName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userImageUrl: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return null
    }

    assertActiveOrganization(identity, {
      clerkOrgId: workspace.clerkOrgId,
      slug: workspace.slug,
    })

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace, {
      name: args.userName,
      firstName: args.userFirstName,
      lastName: args.userLastName,
      email: args.userEmail,
      imageUrl: args.userImageUrl,
    })

    const now = Date.now()

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("userId", user._id)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        route: args.route,
        room: args.room,
        lastSeenAt: now,
      })
    } else {
      await ctx.db.insert("presence", {
        workspaceId: workspace._id,
        userId: user._id,
        route: args.route,
        room: args.room,
        lastSeenAt: now,
      })
    }

    const staleCutoff = now - 120_000
    const staleEntries = await ctx.db
      .query("presence")
      .withIndex("by_workspace_and_last_seen_at", (q) =>
        q.eq("workspaceId", workspace._id).lt("lastSeenAt", staleCutoff)
      )
      .collect()

    for (const entry of staleEntries) {
      await ctx.db.delete(entry._id)
    }

    return null
  },
})

export const listActive = queryGeneric({
  args: {
    workspaceSlug: v.string(),
  },
  handler: async (ctx: ReadCtx, args) => {
    const identity = await requireIdentity(ctx)
    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      return []
    }

    assertActiveOrganization(identity, {
      clerkOrgId: workspace.clerkOrgId,
      slug: workspace.slug,
    })

    await getWorkspaceViewer(ctx, workspace)

    const entries = await getActivePresenceEntries(ctx, workspace._id)

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const user = await ctx.db.get(entry.userId)

        return {
          name: getDisplayNameFromUser(user),
          route: entry.route,
          routeLabel: labelForRoute(entry.route),
          room: entry.room,
          imageUrl: user?.imageUrl ?? null,
          lastSeenAt: entry.lastSeenAt,
        }
      })
    )

    return enriched.sort((a, b) => b.lastSeenAt - a.lastSeenAt)
  },
})
