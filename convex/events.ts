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
import type { Id, MutationCtx, QueryCtx } from "./types"

function isVirtualLocation(location: string) {
  const normalized = location.toLowerCase()

  return (
    normalized.includes("zoom") ||
    normalized.includes("meet") ||
    normalized.includes("online") ||
    normalized.includes("virtual") ||
    normalized.includes("http")
  )
}

function formatEventDateParts(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Use a valid event date.")
  }

  const parsed = new Date(`${date}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Use a valid event date.")
  }

  return {
    dayKey: date,
    dayName: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    }).format(parsed),
    dateLabel: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(parsed),
  }
}

async function nextOrderForDay(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  dayKey: string
) {
  const existing = await ctx.db
    .query("events")
    .withIndex("by_workspace_and_day_order", (q) =>
      q.eq("workspaceId", workspaceId).eq("dayKey", dayKey)
    )
    .collect()

  return existing.reduce((maxOrder, event) => Math.max(maxOrder, event.order), -1) + 1
}

export const schedule = queryGeneric({
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
    const events = await ctx.db
      .query("events")
      .withIndex("by_workspace_and_day_order", (q) =>
        q.eq("workspaceId", workspace._id)
      )
      .collect()

    events.sort((left, right) => {
      if (left.dayKey !== right.dayKey) {
        return left.dayKey.localeCompare(right.dayKey)
      }

      return left.order - right.order
    })

    const grouped = new Map<
      string,
      {
        dayKey: string
        dayName: string
        dateLabel: string
        items: Array<{
          id: string
          title: string
          time: string
          type: string
          location: string
          isVirtual: boolean
        }>
      }
    >()

    for (const event of events) {
      const existing = grouped.get(event.dayKey)
      const item = {
        id: String(event._id),
        title: event.title,
        time: event.time,
        type: event.type,
        location: event.location,
        isVirtual: isVirtualLocation(event.location),
      }

      if (existing) {
        existing.items.push(item)
        continue
      }

      grouped.set(event.dayKey, {
        dayKey: event.dayKey,
        dayName: event.dayName,
        dateLabel: event.dateLabel,
        items: [item],
      })
    }

    const days = Array.from(grouped.values())

    return {
      canManage: role === "admin",
      summary: [
        {
          label: "Upcoming",
          value: events.length.toString().padStart(2, "0"),
          detail: "events and meetings currently on the shared campus calendar",
        },
        {
          label: "Calendar days",
          value: days.length.toString().padStart(2, "0"),
          detail: "distinct dates with something scheduled",
        },
        {
          label: "Virtual-ready",
          value: events
            .filter((event) => isVirtualLocation(event.location))
            .length.toString()
            .padStart(2, "0"),
          detail: "sessions already marked as online, hybrid, or link-based",
        },
      ],
      days,
    }
  },
})

export const createEvent = mutationGeneric({
  args: {
    workspaceSlug: v.string(),
    title: v.string(),
    type: v.string(),
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

    const { role } = await syncCurrentWorkspaceMember(ctx, workspace)
    assertWorkspaceAdmin(role)

    const title = args.title.trim()
    const type = args.type.trim()
    const time = args.time.trim()
    const location = args.location.trim()

    if (title.length < 3) {
      throw new Error("Event title must be at least 3 characters long.")
    }

    if (title.length > 90) {
      throw new Error("Event title must be 90 characters or fewer.")
    }

    if (type.length < 2 || type.length > 40) {
      throw new Error("Event type must be between 2 and 40 characters.")
    }

    if (time.length < 2 || time.length > 40) {
      throw new Error("Event time must be between 2 and 40 characters.")
    }

    if (location.length < 2 || location.length > 80) {
      throw new Error("Event location must be between 2 and 80 characters.")
    }

    const { dayKey, dayName, dateLabel } = formatEventDateParts(args.date)
    const order = await nextOrderForDay(ctx, workspace._id, dayKey)
    const eventId = await ctx.db.insert("events", {
      workspaceId: workspace._id,
      dayKey,
      dayName,
      dateLabel,
      time,
      title,
      type,
      location,
      order,
    })

    return {
      eventId: String(eventId),
    }
  },
})
