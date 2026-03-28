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
import type { MutationCtx, QueryCtx } from "./types"

export const library = queryGeneric({
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
    const resources = await ctx.db
      .query("documents")
      .withIndex("by_workspace_and_updated_at", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()

    resources.sort((left, right) => right.updatedAt - left.updatedAt)

    return {
      canManage: role === "admin",
      summary: [
        {
          label: "Resources",
          value: resources.length.toString().padStart(2, "0"),
          detail: "playbooks, notes, and reusable context stored for this campus",
        },
        {
          label: "Playbooks",
          value: resources
            .filter((resource) =>
              ["playbook", "guide", "ops"].includes(resource.tag.toLowerCase())
            )
            .length.toString()
            .padStart(2, "0"),
          detail: "documents tagged for repeatable club or event operations",
        },
        {
          label: "Updated",
          value: resources
            .filter((resource) => resource.updatedAt > Date.now() - 7 * 24 * 60 * 60 * 1000)
            .length.toString()
            .padStart(2, "0"),
          detail: "resources touched in the last seven days",
        },
      ],
      resources: resources.map((resource) => ({
        id: String(resource._id),
        title: resource.title,
        summary: resource.summary,
        tag: resource.tag,
        ownerName: resource.ownerName,
        updatedAt: resource.updatedAt,
      })),
    }
  },
})

export const createResource = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    title: v.string(),
    summary: v.string(),
    tag: v.string(),
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

    const title = args.title.trim()
    const summary = args.summary.trim()
    const tag = args.tag.trim()

    if (title.length < 3) {
      throw new Error("Resource title must be at least 3 characters long.")
    }

    if (title.length > 90) {
      throw new Error("Resource title must be 90 characters or fewer.")
    }

    if (summary.length < 8 || summary.length > 280) {
      throw new Error("Resource summary must be between 8 and 280 characters.")
    }

    if (tag.length < 2 || tag.length > 24) {
      throw new Error("Resource tag must be between 2 and 24 characters.")
    }

    const resourceId = await ctx.db.insert("documents", {
      workspaceId: workspace._id,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48),
      title,
      summary,
      tag,
      updatedAt: Date.now(),
      ownerName: user.name,
    })

    return {
      resourceId: String(resourceId),
    }
  },
})
