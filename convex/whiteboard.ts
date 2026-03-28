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
import { getActivePresenceEntries } from "./presence"
import type { Doc, Id, MutationCtx, QueryCtx } from "./types"

const pollStatus = v.union(v.literal("open"), v.literal("closed"))
const passCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function formatCount(value: number) {
  return value.toString().padStart(2, "0")
}

function labelForRoute(route: string) {
  if (route === "/") return "Hub"
  if (route.startsWith("/channels")) return "Club spaces"
  if (route.startsWith("/projects")) return "Event ops"
  if (route.startsWith("/docs")) return "Resources"
  if (route.startsWith("/whiteboard")) return "Gate & polls"
  if (route.startsWith("/calendar")) return "Events"
  return "Campus space"
}

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : undefined
}

function sanitizePassCode(value: string) {
  return value.trim().toUpperCase()
}

function createOptionId(label: string, index: number) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24)

  return `${slug || "option"}-${index + 1}`
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

async function requireGatePass(
  ctx: QueryCtx | MutationCtx,
  passId: Id<"gatePasses">
): Promise<Doc<"gatePasses">> {
  const pass = await ctx.db.get(passId)

  if (!pass) {
    throw new Error("Gate pass not found.")
  }

  return pass
}

async function requirePoll(
  ctx: QueryCtx | MutationCtx,
  pollId: Id<"polls">
): Promise<Doc<"polls">> {
  const poll = await ctx.db.get(pollId)

  if (!poll) {
    throw new Error("Poll not found.")
  }

  return poll
}

async function generateGatePassCode(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let nextCode = "CH"

    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * passCodeAlphabet.length)
      nextCode += passCodeAlphabet[randomIndex]
    }

    const existing = await ctx.db
      .query("gatePasses")
      .withIndex("by_workspace_and_code", (q) =>
        q.eq("workspaceId", workspaceId).eq("code", nextCode)
      )
      .unique()

    if (!existing) {
      return nextCode
    }
  }

  throw new Error("Unable to generate a unique gate pass right now.")
}

export const controlRoom = queryGeneric({
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
    const [presenceEntries, passes, polls] = await Promise.all([
      getActivePresenceEntries(ctx, workspace._id),
      ctx.db
        .query("gatePasses")
        .withIndex("by_workspace_and_created_at", (q) =>
          q.eq("workspaceId", workspace._id)
        )
        .collect(),
      ctx.db
        .query("polls")
        .withIndex("by_workspace_and_created_at", (q) =>
          q.eq("workspaceId", workspace._id)
        )
        .collect(),
    ])

    const activeMembers = await Promise.all(
      presenceEntries
        .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
        .slice(0, 6)
        .map(async (entry) => {
          const user = await ctx.db.get(entry.userId)

          return {
            name: user?.name ?? "Student member",
            routeLabel: labelForRoute(entry.route),
            lastSeenAt: entry.lastSeenAt,
          }
        })
    )

    const gatePasses = await Promise.all(
      passes.map(async (pass) => {
        const issuedByUser = await ctx.db.get(pass.createdByUserId)
        const checkedInByUser = pass.checkedInByUserId
          ? await ctx.db.get(pass.checkedInByUserId)
          : null

        return {
          id: String(pass._id),
          code: pass.code,
          attendeeName: pass.attendeeName,
          attendeeEmail: pass.attendeeEmail ?? null,
          note: pass.note ?? null,
          createdAt: pass.createdAt,
          issuedByName: issuedByUser?.name ?? "Campus admin",
          checkedInAt: pass.checkedInAt ?? null,
          checkedInByName: checkedInByUser?.name ?? null,
        }
      })
    )

    gatePasses.sort((left, right) => {
      const leftPending = left.checkedInAt === null
      const rightPending = right.checkedInAt === null

      if (leftPending !== rightPending) {
        return leftPending ? -1 : 1
      }

      return right.createdAt - left.createdAt
    })

    const pollSnapshots = await Promise.all(
      polls.map(async (poll) => {
        const [createdByUser, votes] = await Promise.all([
          ctx.db.get(poll.createdByUserId),
          ctx.db
            .query("pollVotes")
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
          createdByName: createdByUser?.name ?? "Campus admin",
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

    const checkedInCount = gatePasses.filter((pass) => pass.checkedInAt !== null).length
    const totalVotes = pollSnapshots.reduce((sum, poll) => sum + poll.totalVotes, 0)

    return {
      canManage: role === "admin",
      activeNow: presenceEntries.length,
      summary: [
        {
          label: "Pending entry",
          value: formatCount(gatePasses.length - checkedInCount),
          detail: "issued passes still waiting to be checked in at the desk",
        },
        {
          label: "Checked in",
          value: formatCount(checkedInCount),
          detail: "passes already processed through the live gate flow",
        },
        {
          label: "Open polls",
          value: formatCount(pollSnapshots.filter((poll) => poll.status === "open").length),
          detail: "decisions that members can still vote on right now",
        },
        {
          label: "Votes cast",
          value: formatCount(totalVotes),
          detail: "recorded votes across every live and archived poll",
        },
      ],
      activeMembers,
      gatePasses,
      polls: pollSnapshots,
    }
  },
})

export const createGatePass = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    attendeeName: v.string(),
    attendeeEmail: v.optional(v.string()),
    note: v.optional(v.string()),
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

    const attendeeName = args.attendeeName.trim()
    const attendeeEmail = normalizeOptionalString(args.attendeeEmail)
    const note = normalizeOptionalString(args.note)

    if (attendeeName.length < 2) {
      throw new Error("Attendee name must be at least 2 characters long.")
    }

    if (attendeeName.length > 80) {
      throw new Error("Attendee name must be 80 characters or fewer.")
    }

    if (attendeeEmail && attendeeEmail.length > 120) {
      throw new Error("Attendee email must be 120 characters or fewer.")
    }

    if (note && note.length > 180) {
      throw new Error("Gate note must be 180 characters or fewer.")
    }

    const code = await generateGatePassCode(ctx, workspace._id)
    const passId = await ctx.db.insert("gatePasses", {
      workspaceId: workspace._id,
      code,
      attendeeName,
      attendeeEmail,
      note,
      createdAt: Date.now(),
      createdByUserId: user._id,
    })

    return {
      passId: String(passId),
      code,
    }
  },
})

export const scanGatePass = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    code: v.string(),
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

    const code = sanitizePassCode(args.code)

    if (code.length < 4) {
      throw new Error("Enter a valid gate pass code.")
    }

    const pass = await ctx.db
      .query("gatePasses")
      .withIndex("by_workspace_and_code", (q) =>
        q.eq("workspaceId", workspace._id).eq("code", code)
      )
      .unique()

    if (!pass) {
      throw new Error("No gate pass matched that code.")
    }

    if (pass.checkedInAt) {
      throw new Error("That gate pass has already been checked in.")
    }

    await ctx.db.patch(pass._id, {
      checkedInAt: Date.now(),
      checkedInByUserId: user._id,
    })

    return {
      passId: String(pass._id),
      attendeeName: pass.attendeeName,
      code: pass.code,
    }
  },
})

export const resetGatePass = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    passId: v.id("gatePasses"),
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

    const pass = await requireGatePass(ctx, args.passId)

    if (pass.workspaceId !== workspace._id) {
      throw new Error("Gate pass does not belong to this campus space.")
    }

    await ctx.db.patch(pass._id, {
      checkedInAt: undefined,
      checkedInByUserId: undefined,
    })

    return null
  },
})

export const createPoll = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
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

    const { role, user } = await syncCurrentWorkspaceMember(ctx, workspace)
    assertWorkspaceAdmin(role)

    const question = args.question.trim()
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

    const pollId = await ctx.db.insert("polls", {
      workspaceId: workspace._id,
      question,
      description,
      status: "open",
      options,
      createdAt: Date.now(),
      createdByUserId: user._id,
    })

    return {
      pollId: String(pollId),
    }
  },
})

export const voteOnPoll = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    pollId: v.id("polls"),
    optionId: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await requireIdentity(ctx)
    assertActiveOrganization(identity, { slug: args.workspaceSlug })

    const workspace = await getWorkspaceBySlug(ctx, args.workspaceSlug)

    if (!workspace) {
      throw new Error("Campus space not found.")
    }

    const { user } = await syncCurrentWorkspaceMember(ctx, workspace)
    const poll = await requirePoll(ctx, args.pollId)

    if (poll.workspaceId !== workspace._id) {
      throw new Error("Poll does not belong to this campus space.")
    }

    if (poll.status !== "open") {
      throw new Error("This poll is already closed.")
    }

    if (!poll.options.some((option) => option.id === args.optionId)) {
      throw new Error("Pick one of the available poll options.")
    }

    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll_and_user", (q) =>
        q.eq("pollId", poll._id).eq("userId", user._id)
      )
      .unique()

    const now = Date.now()

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        optionId: args.optionId,
        updatedAt: now,
      })
      return null
    }

    await ctx.db.insert("pollVotes", {
      workspaceId: workspace._id,
      pollId: poll._id,
      userId: user._id,
      optionId: args.optionId,
      createdAt: now,
      updatedAt: now,
    })

    return null
  },
})

export const setPollStatus = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    pollId: v.id("polls"),
    status: pollStatus,
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

    const poll = await requirePoll(ctx, args.pollId)

    if (poll.workspaceId !== workspace._id) {
      throw new Error("Poll does not belong to this campus space.")
    }

    await ctx.db.patch(poll._id, {
      status: args.status,
    })

    return null
  },
})
