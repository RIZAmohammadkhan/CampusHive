import { queryRef } from "@/modules/core/convex/ref"

export type OfficeData = {
  currentRole: "admin" | "member"
  metrics: Array<{ label: string; value: string; detail: string }>
  activeMembers: Array<{
    id: string
    name: string
    role: "admin" | "member"
    route: string | null
    routeLabel: string | null
    isActive: boolean
    lastSeenAt: number
  }>
  channels: Array<{
    id: string
    slug: string
    name: string
    description: string
    category: string
    messageCount: number
    lastMessageAt: number | null
  }>
  recentTasks: Array<{
    id: string
    title: string
    column: "now" | "next" | "later"
    priority: "High" | "Medium" | "Low"
    assigneeName: string | null
  }>
}

export const dashboardApi = {
  office: queryRef<{ workspaceSlug: string }, OfficeData | null>(
    "dashboard:office"
  ),
}
