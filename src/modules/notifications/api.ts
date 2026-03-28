import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type NotificationData = {
  unreadCount: number
  items: Array<{
    id: string
    kind:
      | "dm"
      | "mention"
      | "workspaceEvent"
      | "clubEvent"
      | "taskAssigned"
      | "taskVolunteer"
    title: string
    body: string
    route: string
    createdAt: number
    readAt: number | null
  }>
}

export const notificationsApi = {
  list: queryRef<{ workspaceSlug: string }, NotificationData>(
    "notifications:list"
  ),
  markAllRead: mutationRef<{ workspaceSlug: string }, null>(
    "notifications:markAllRead"
  ),
}
