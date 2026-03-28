import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type ProjectsBoardData = {
  canManage: boolean
  currentUserId: string | null
  members: Array<{
    id: string
    name: string
    imageUrl: string | null
    role: "admin" | "member"
  }>
  events: Array<{
    id: string
    title: string
    dateLabel: string
  }>
  summary: Array<{ label: string; value: string; detail: string }>
  tasks: Array<{
    id: string
    eventId: string | null
    eventTitle: string
    eventDateLabel: string
    eventDayKey: string | null
    title: string
    description: string
    dueLabel: string
    priority: "High" | "Medium" | "Low"
    status: "acknowledged" | "inProgress" | "done" | "flagged"
    statusLabel: string
    taskKind: "assigned" | "volunteer"
    assigneeUserId: string | null
    assigneeName: string | null
    completedAt: number | null
    completedByUserId: string | null
    completedByName: string | null
    completionNote: string
    updatedAt: number | null
    canVolunteer: boolean
    isCurrentUserVolunteer: boolean
  }>
}

export const projectsApi = {
  board: queryRef<{ workspaceSlug: string }, ProjectsBoardData | null>(
    "projects:board"
  ),
  createTask: mutationRef<
    {
      workspaceSlug: string
      eventId: string
      taskKind: "assigned" | "volunteer"
      title: string
      description?: string
      status: "acknowledged" | "inProgress" | "done" | "flagged"
      priority: "High" | "Medium" | "Low"
      dueLabel?: string
      assigneeUserId?: string | null
    },
    { taskId: string }
  >("projects:createTask"),
  assignTask: mutationRef<
    {
      workspaceSlug: string
      taskId: string
      assigneeUserId: string | null
    },
    null
  >("projects:assignTask"),
  volunteerForTask: mutationRef<
    {
      workspaceSlug: string
      taskId: string
    },
    null
  >("projects:volunteerForTask"),
  completeTask: mutationRef<
    {
      workspaceSlug: string
      taskId: string
      message?: string
    },
    null
  >("projects:completeTask"),
  updateTaskStatus: mutationRef<
    {
      workspaceSlug: string
      taskId: string
      status: "acknowledged" | "inProgress" | "done" | "flagged"
    },
    null
  >("projects:updateTaskStatus"),
}
