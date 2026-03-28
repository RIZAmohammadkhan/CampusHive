import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  assertWorkspaceAdmin,
  getWorkspaceViewer,
  requireIdentity,
  syncCurrentWorkspaceMember,
} from "./lib/auth"
import { createNotifications } from "./notifications"
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

async function findConversationBySlug(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  slug: string
) {
  return await ctx.db
    .query("conversations")
    .withIndex("by_workspace_and_slug", (q) =>
      q.eq("workspaceId", workspaceId).eq("slug", slug)
    )
    .unique()
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

    const { role, currentUser } = await getWorkspaceViewer(ctx, workspace)
    const [events, clubEvents, conversations] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_workspace_and_day_order", (q) =>
          q.eq("workspaceId", workspace._id)
        )
        .collect(),
      ctx.db
        .query("clubEvents")
        .withIndex("by_workspace_and_created_at", (q) => q.eq("workspaceId", workspace._id))
        .collect(),
      ctx.db
        .query("conversations")
        .withIndex("by_workspace_and_slug", (q) => q.eq("workspaceId", workspace._id))
        .collect(),
    ])
    const conversationsById = new Map(
      conversations.map((conversation) => [String(conversation._id), conversation] as const)
    )
    const combinedItems: Array<{
      dayKey: string
      dayName: string
      dateLabel: string
      item: {
        id: string
        kind: "workspace" | "club"
        title: string
        time: string
        type: string | null
        location: string
        isVirtual: boolean
        clubName: string | null
        clubSlug: string | null
        eventStatus: "open" | "closed" | null
        ticketingEnabled: boolean
        ticketCount: number | null
        remainingCapacity: number | null
        viewerTicketStatus: "pending" | "approved" | "rejected" | null
      }
    }> = []

    for (const event of events) {
      combinedItems.push({
        dayKey: event.dayKey,
        dayName: event.dayName,
        dateLabel: event.dateLabel,
        item: {
          id: String(event._id),
          kind: "workspace",
          title: event.title,
          time: event.time,
          type: event.type,
          location: event.location,
          isVirtual: isVirtualLocation(event.location),
          clubName: null,
          clubSlug: null,
          eventStatus: null,
          ticketingEnabled: false,
          ticketCount: null,
          remainingCapacity: null,
          viewerTicketStatus: null,
        },
      })
    }

    const clubEventItems = await Promise.all(
      clubEvents.map(async (event) => {
        const conversation = conversationsById.get(String(event.conversationId))

        if (!conversation || conversation.kind !== "channel") {
          return null
        }

        const tickets = await ctx.db
          .query("clubEventTickets")
          .withIndex("by_event_and_created_at", (q) => q.eq("eventId", event._id))
          .collect()
        const approvedCount = tickets.filter(
          (ticket) =>
            (ticket.status ?? "approved") === "approved" &&
            typeof ticket.code === "string" &&
            ticket.code.length > 0
        ).length
        const viewerTicket = currentUser
          ? tickets.find((ticket) => ticket.userId === currentUser._id) ?? null
          : null
        const { dayKey, dayName, dateLabel } = formatEventDateParts(event.date)

        return {
          dayKey,
          dayName,
          dateLabel,
          item: {
            id: String(event._id),
            kind: "club" as const,
            title: event.title,
            time: event.time,
            type: "Club event",
            location: event.location,
            isVirtual: isVirtualLocation(event.location),
            clubName: conversation.name,
            clubSlug: conversation.slug,
            eventStatus: event.status,
            ticketingEnabled: true,
            ticketCount: approvedCount,
            remainingCapacity:
              typeof event.capacity === "number"
                ? Math.max(event.capacity - approvedCount, 0)
                : null,
            viewerTicketStatus: viewerTicket ? (viewerTicket.status ?? "approved") : null,
          },
        }
      })
    )

    combinedItems.push(...clubEventItems.filter((event) => event !== null))
    combinedItems.sort((left, right) => {
      if (left.dayKey !== right.dayKey) {
        return left.dayKey.localeCompare(right.dayKey)
      }

      if (left.item.time !== right.item.time) {
        return left.item.time.localeCompare(right.item.time)
      }

      return left.item.title.localeCompare(right.item.title)
    })

    const grouped = new Map<
      string,
      {
        dayKey: string
        dayName: string
        dateLabel: string
        items: Array<{
          id: string
          kind: "workspace" | "club"
          title: string
          time: string
          type: string | null
          location: string
          isVirtual: boolean
          clubName: string | null
          clubSlug: string | null
          eventStatus: "open" | "closed" | null
          ticketingEnabled: boolean
          ticketCount: number | null
          remainingCapacity: number | null
          viewerTicketStatus: "pending" | "approved" | "rejected" | null
        }>
      }
    >()

    for (const entry of combinedItems) {
      const existing = grouped.get(entry.dayKey)

      if (existing) {
        existing.items.push(entry.item)
        continue
      }

      grouped.set(entry.dayKey, {
        dayKey: entry.dayKey,
        dayName: entry.dayName,
        dateLabel: entry.dateLabel,
        items: [entry.item],
      })
    }

    const days = Array.from(grouped.values())

    return {
      canManage: role === "admin",
      manageableClubs:
        role === "admin"
          ? conversations
              .filter(
                (conversation) =>
                  conversation.kind === "channel" && conversation.slug !== "general"
              )
              .map((conversation) => ({
                slug: conversation.slug,
                name: conversation.name,
              }))
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      summary: [
        {
          label: "Upcoming",
          value: combinedItems.length.toString().padStart(2, "0"),
          detail: "events and meetings currently on the shared campus calendar",
        },
        {
          label: "Calendar days",
          value: days.length.toString().padStart(2, "0"),
          detail: "distinct dates with something scheduled",
        },
        {
          label: "Virtual-ready",
          value: combinedItems
            .filter((event) => event.item.isVirtual)
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
    type: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    clubSlug: v.optional(v.string()),
    capacity: v.optional(v.number()),
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
    const type = args.type?.trim() ?? ""
    const time = args.time.trim()
    const location = args.location.trim()

    if (title.length < 3) {
      throw new Error("Event title must be at least 3 characters long.")
    }

    if (title.length > 90) {
      throw new Error("Event title must be 90 characters or fewer.")
    }

    if (!args.clubSlug && (type.length < 2 || type.length > 40)) {
      throw new Error("Event type must be between 2 and 40 characters.")
    }

    if (time.length < 2 || time.length > 40) {
      throw new Error("Event time must be between 2 and 40 characters.")
    }

    if (location.length < 2 || location.length > 80) {
      throw new Error("Event location must be between 2 and 80 characters.")
    }

    if (
      typeof args.capacity === "number" &&
      (!Number.isInteger(args.capacity) || args.capacity < 1 || args.capacity > 5000)
    ) {
      throw new Error("Ticket capacity must be a whole number between 1 and 5000.")
    }

    if (args.clubSlug) {
      const conversation = await findConversationBySlug(ctx, workspace._id, args.clubSlug)

      if (!conversation || conversation.kind !== "channel" || conversation.slug === "general") {
        throw new Error("Choose a valid club for this event.")
      }

      const eventId = await ctx.db.insert("clubEvents", {
        workspaceId: workspace._id,
        conversationId: conversation._id,
        title,
        date: args.date,
        time,
        location,
        capacity: args.capacity,
        status: "open",
        createdAt: Date.now(),
        createdByUserId: user._id,
      })

      const memberships = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
        .collect()

      await createNotifications(ctx, {
        workspaceId: workspace._id,
        recipientUserIds: memberships.map((membership) => membership.userId),
        kind: "clubEvent",
        title: `New ${conversation.name} event: ${title}`,
        body: `${args.date} · ${time} · ${location}`,
        route: `/channels/${conversation.slug}`,
        actorUserId: user._id,
        conversationId: conversation._id,
        eventId,
      })

      return {
        eventId: String(eventId),
      }
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

    const workspaceMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_role", (q) => q.eq("workspaceId", workspace._id))
      .collect()

    await createNotifications(ctx, {
      workspaceId: workspace._id,
      recipientUserIds: workspaceMembers.map((member) => member.userId),
      kind: "workspaceEvent",
      title: `New event: ${title}`,
      body: `${dateLabel} · ${time} · ${location}`,
      route: "/calendar",
      actorUserId: user._id,
      eventId,
    })

    return {
      eventId: String(eventId),
    }
  },
})
