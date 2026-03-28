import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type ProjectsBoardData = {
  canManage: boolean
  members: Array<{
    id: string
    name: string
    imageUrl: string | null
    role: "admin" | "member"
  }>
  summary: Array<{ label: string; value: string; detail: string }>
  columns: Array<{
    id: "acknowledged" | "inProgress" | "done" | "flagged"
    name: string
    cards: Array<{
      id: string
      title: string
      description: string
      dueLabel: string
      priority: "High" | "Medium" | "Low"
      status: "acknowledged" | "inProgress" | "done" | "flagged"
      assigneeUserId: string | null
      assigneeName: string | null
      updatedAt: number | null
    }>
  }>
}

export const projectsApi = {
  board: queryRef<{ workspaceSlug: string }, ProjectsBoardData | null>(
    "projects:board"
  ),
  createTask: mutationRef<
    {
      workspaceSlug: string
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
  updateTaskStatus: mutationRef<
    {
      workspaceSlug: string
      taskId: string
      status: "acknowledged" | "inProgress" | "done" | "flagged"
    },
    null
  >("projects:updateTaskStatus"),
}
