import type { FunctionReference } from "convex/server"

const queryRef = <Args extends Record<string, unknown>, ReturnType>(name: string) =>
  name as unknown as FunctionReference<"query", "public", Args, ReturnType>

const mutationRef = <Args extends Record<string, unknown>, ReturnType>(
  name: string
) => name as unknown as FunctionReference<"mutation", "public", Args, ReturnType>

export type ViewerData = {
  workspaceId: string
  workspaceName: string
  role: "admin" | "member"
  currentUserId: string | null
}

export type DirectoryData = {
  currentRole: "admin" | "member"
  members: Array<{
    id: string
    name: string
    email: string | null
    imageUrl: string | null
    role: "admin" | "member"
    isCurrentUser: boolean
    isActive: boolean
    lastSeenAt: number | null
  }>
}

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

export type ChannelListData = {
  currentRole: "admin" | "member"
  channels: Array<{
    id: string
    slug: string
    name: string
    description: string
    access: "public" | "members"
    memberCount: number
    messageCount: number
    lastMessageAt: number | null
    membershipState:
      | "public"
      | "admin"
      | "owner"
      | "officer"
      | "member"
      | "pending"
      | "notMember"
    viewerClubRole: "owner" | "officer" | "member" | null
    canManage: boolean
    canOpen: boolean
    canRequestToJoin: boolean
  }>
}

export type ConversationData = {
  slug: string
  name: string
  description: string
  kind: "channel" | "dm"
  access: "public" | "members"
  canManage: boolean
  canEditRoles: boolean
  viewerClubRole: "owner" | "officer" | "member" | null
  memberCount: number | null
  viewerMembershipState:
    | "public"
    | "admin"
    | "owner"
    | "officer"
    | "member"
    | "pending"
    | "notMember"
  canViewMessages: boolean
  canPostMessages: boolean
  canRequestToJoin: boolean
  canLeave: boolean
  members: Array<{
    id: string
    name: string
    imageUrl: string | null
    role: "owner" | "officer" | "member"
    joinedAt: number
    isCurrentUser: boolean
  }>
  pendingRequests: Array<{
    userId: string
    name: string
    imageUrl: string | null
    createdAt: number
  }>
}

export type MessageData = {
  id: string
  body: string
  createdAt: number
  author: {
    name: string
    imageUrl: string | null
    isCurrentUser: boolean
  }
}

export type PresenceData = Array<{
  name: string
  route: string
  routeLabel: string
  room: string
  imageUrl: string | null
  lastSeenAt: number
}>

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

export type ResourceLibraryData = {
  canManage: boolean
  summary: Array<{ label: string; value: string; detail: string }>
  resources: Array<{
    id: string
    title: string
    summary: string
    tag: string
    ownerName: string
    updatedAt: number
  }>
}

export const convexApi = {
  workspaces: {
    bootstrap: mutationRef<
      {
        clerkOrgId: string
        slug: string
        name: string
        userName?: string
        userEmail?: string
        userImageUrl?: string
      },
      { workspaceId: string; userId: string; role: "admin" | "member" }
    >("workspaces:bootstrap"),
    viewer: queryRef<{ workspaceSlug: string }, ViewerData | null>(
      "workspaces:viewer"
    ),
    directory: queryRef<{ workspaceSlug: string }, DirectoryData | null>(
      "workspaces:directory"
    ),
  },
  presence: {
    heartbeat: mutationRef<
      { workspaceSlug: string; route: string; room: string },
      null
    >("presence:heartbeat"),
    listActive: queryRef<{ workspaceSlug: string }, PresenceData>(
      "presence:listActive"
    ),
  },
  chat: {
    listChannels: queryRef<{ workspaceSlug: string }, ChannelListData | null>(
      "chat:listChannels"
    ),
    conversation: queryRef<
      { workspaceSlug: string; slug: string },
      ConversationData | null
    >("chat:conversation"),
    listMessages: queryRef<
      { workspaceSlug: string; slug: string },
      MessageData[]
    >("chat:listMessages"),
    createChannel: mutationRef<
      { workspaceSlug: string; name: string; description?: string },
      { channelId: string; slug: string }
    >("chat:createChannel"),
    requestToJoin: mutationRef<
      { workspaceSlug: string; slug: string },
      null
    >("chat:requestToJoin"),
    reviewJoinRequest: mutationRef<
      {
        workspaceSlug: string
        slug: string
        userId: string
        approve: boolean
      },
      null
    >("chat:reviewJoinRequest"),
    leaveChannel: mutationRef<
      { workspaceSlug: string; slug: string },
      null
    >("chat:leaveChannel"),
    removeMember: mutationRef<
      { workspaceSlug: string; slug: string; userId: string },
      null
    >("chat:removeMember"),
    setMemberRole: mutationRef<
      {
        workspaceSlug: string
        slug: string
        userId: string
        role: "owner" | "officer" | "member"
      },
      null
    >("chat:setMemberRole"),
    sendMessage: mutationRef<
      { workspaceSlug: string; slug: string; body: string },
      null
    >("chat:sendMessage"),
  },
  dashboard: {
    office: queryRef<{ workspaceSlug: string }, OfficeData | null>("dashboard:office"),
  },
  projects: {
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
  },
  events: {
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
  },
  resources: {
    library: queryRef<{ workspaceSlug: string }, ResourceLibraryData | null>(
      "resources:library"
    ),
    createResource: mutationRef<
      {
        workspaceSlug: string
        title: string
        summary: string
        tag: string
      },
      { resourceId: string }
    >("resources:createResource"),
  },
}
