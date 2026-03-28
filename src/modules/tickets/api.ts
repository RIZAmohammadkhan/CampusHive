import { queryRef } from "@/modules/core/convex/ref"

export type ViewerTicketsData = {
  workspaceName: string
  summary: {
    approved: number
    pending: number
    rejected: number
    checkedIn: number
  }
  tickets: Array<{
    id: string
    clubSlug: string
    clubName: string
    eventId: string
    eventTitle: string
    eventDate: string
    eventTime: string
    eventLocation: string
    status: "pending" | "approved" | "rejected"
    code: string | null
    createdAt: number
    approvedAt: number | null
    checkedInAt: number | null
    qrValue: string | null
  }>
}

export const ticketsApi = {
  viewerTickets: queryRef<{ workspaceSlug: string }, ViewerTicketsData | null>(
    "tickets:viewerTickets"
  ),
}
