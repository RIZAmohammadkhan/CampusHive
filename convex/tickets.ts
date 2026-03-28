import { queryGeneric } from "convex/server"
import { v } from "convex/values"

import {
  assertActiveOrganization,
  requireIdentity,
  getWorkspaceViewer,
} from "./lib/auth"
import { getWorkspaceBySlug } from "./lib/workspaces"
import type { Doc, ReadCtx } from "./types"

type TicketStatus = "pending" | "approved" | "rejected"

function resolveTicketStatus(ticket: Doc<"clubEventTickets">): TicketStatus {
  return ticket.status ?? "approved"
}

function isApprovedTicket(ticket: Doc<"clubEventTickets">) {
  return (
    resolveTicketStatus(ticket) === "approved" &&
    typeof ticket.code === "string" &&
    ticket.code.length > 0
  )
}

function buildClubTicketQrValue({
  workspaceSlug,
  clubSlug,
  eventId,
  ticketId,
  code,
}: {
  workspaceSlug: string
  clubSlug: string
  eventId: string
  ticketId: string
  code: string
}) {
  return JSON.stringify({
    type: "campushive-club-ticket",
    workspaceSlug,
    clubSlug,
    eventId,
    ticketId,
    code,
  })
}

export const viewerTickets = queryGeneric({
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

    const { currentUser } = await getWorkspaceViewer(ctx, workspace)

    if (!currentUser) {
      return {
        workspaceName: workspace.name,
        summary: {
          approved: 0,
          pending: 0,
          rejected: 0,
          checkedIn: 0,
        },
        tickets: [],
      }
    }

    const tickets = await ctx.db
      .query("clubEventTickets")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", currentUser._id))
      .order("desc")
      .collect()

    const ticketSnapshots = (
      await Promise.all(
        tickets.map(async (ticket) => {
          if (ticket.workspaceId !== workspace._id) {
            return null
          }

          const event = await ctx.db.get(ticket.eventId)

          if (!event || event.workspaceId !== workspace._id) {
            return null
          }

          const conversation = await ctx.db.get(event.conversationId)

          if (!conversation) {
            return null
          }

          const status = resolveTicketStatus(ticket)
          const approved = isApprovedTicket(ticket)

          return {
            id: String(ticket._id),
            clubSlug: conversation.slug,
            clubName: conversation.name,
            eventId: String(event._id),
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            status,
            code: approved ? ticket.code ?? null : null,
            createdAt: ticket.createdAt,
            approvedAt: ticket.approvedAt ?? null,
            checkedInAt: ticket.checkedInAt ?? null,
            qrValue:
              approved && ticket.code
                ? buildClubTicketQrValue({
                    workspaceSlug: workspace.slug,
                    clubSlug: conversation.slug,
                    eventId: String(event._id),
                    ticketId: String(ticket._id),
                    code: ticket.code,
                  })
                : null,
          }
        })
      )
    ).filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null)

    return {
      workspaceName: workspace.name,
      summary: {
        approved: ticketSnapshots.filter((ticket) => ticket.status === "approved").length,
        pending: ticketSnapshots.filter((ticket) => ticket.status === "pending").length,
        rejected: ticketSnapshots.filter((ticket) => ticket.status === "rejected").length,
        checkedIn: ticketSnapshots.filter((ticket) => ticket.checkedInAt !== null).length,
      },
      tickets: ticketSnapshots,
    }
  },
})
