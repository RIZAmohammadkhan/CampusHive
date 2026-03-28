import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type EventsScheduleData = {
  canManage: boolean
  summary: Array<{ label: string; value: string; detail: string }>
  days: Array<{
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
      type: string
      date: string
      time: string
      location: string
    },
    { eventId: string }
  >("events:createEvent"),
}
