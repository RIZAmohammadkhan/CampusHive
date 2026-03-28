import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type WhiteboardControlRoomData = {
  canManage: boolean
  activeNow: number
  summary: Array<{ label: string; value: string; detail: string }>
  activeMembers: Array<{
    name: string
    routeLabel: string
    lastSeenAt: number
  }>
  gatePasses: Array<{
    id: string
    code: string
    attendeeName: string
    attendeeEmail: string | null
    note: string | null
    createdAt: number
    issuedByName: string
    checkedInAt: number | null
    checkedInByName: string | null
  }>
  polls: Array<{
    id: string
    question: string
    description: string | null
    status: "open" | "closed"
    totalVotes: number
    createdAt: number
    createdByName: string
    viewerVoteOptionId: string | null
    options: Array<{
      id: string
      label: string
      votes: number
      percentage: number
    }>
  }>
}

export const whiteboardApi = {
  controlRoom: queryRef<{ workspaceSlug: string }, WhiteboardControlRoomData | null>(
    "whiteboard:controlRoom"
  ),
  createGatePass: mutationRef<
    {
      workspaceSlug: string
      attendeeName: string
      attendeeEmail?: string
      note?: string
    },
    { passId: string; code: string }
  >("whiteboard:createGatePass"),
  scanGatePass: mutationRef<
    {
      workspaceSlug: string
      code: string
    },
    { passId: string; attendeeName: string; code: string }
  >("whiteboard:scanGatePass"),
  resetGatePass: mutationRef<
    {
      workspaceSlug: string
      passId: string
    },
    null
  >("whiteboard:resetGatePass"),
  createPoll: mutationRef<
    {
      workspaceSlug: string
      question: string
      description?: string
      options: string[]
    },
    { pollId: string }
  >("whiteboard:createPoll"),
  voteOnPoll: mutationRef<
    {
      workspaceSlug: string
      pollId: string
      optionId: string
    },
    null
  >("whiteboard:voteOnPoll"),
  setPollStatus: mutationRef<
    {
      workspaceSlug: string
      pollId: string
      status: "open" | "closed"
    },
    null
  >("whiteboard:setPollStatus"),
}
