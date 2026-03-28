import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type EventsScheduleData = {
  canManage: boolean
  manageableClubs: Array<{
    slug: string
    name: string
  }>
  summary: Array<{ label: string; value: string; detail: string }>
  days: Array<{
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
  }>
}

export const eventsApi = {
  schedule: queryRef<{ workspaceSlug: string }, EventsScheduleData | null>(
    "events:schedule"
  ),
  createEvent: mutationRef<
    {
      workspaceSlug: string
      title: string
      type?: string
      date: string
      time: string
      location: string
      clubSlug?: string
      capacity?: number
    },
    { eventId: string }
  >("events:createEvent"),
}
