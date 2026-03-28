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
    id: string
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

export type MemberProfileData = {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string | null
  imageUrl: string | null
  workspaceName: string
  workspaceSlug: string
  workspaceRole: "admin" | "member"
  joinedAt: number
  clubMemberships: Array<{
    id: string
    slug: string
    name: string
    role: "owner" | "officer" | "member"
    joinedAt: number
  }>
  eventTickets: Array<{
    id: string
    code: string
    eventTitle: string
    clubName: string
    createdAt: number
    checkedInAt: number | null
  }>
}

export type ClubOperationsData = {
  canManage: boolean
  canParticipate: boolean
  clubName: string
  workspaceName: string
  events: Array<{
    id: string
    title: string
    summary: string | null
    date: string
    time: string
    location: string
    status: "open" | "closed"
    createdAt: number
    createdByName: string
    ticketCount: number
    checkedInCount: number
    viewerTicket: {
      id: string
      code: string
      createdAt: number
      checkedInAt: number | null
      attendeeName: string
      attendeeEmail: string | null
      organizationName: string
      clubName: string
      eventTitle: string
      eventDate: string
      eventTime: string
      eventLocation: string
      qrValue: string
    } | null
    attendees: Array<{
      ticketId: string
      userId: string
      name: string
      email: string | null
      code: string
      createdAt: number
      checkedInAt: number | null
      checkedInByName: string | null
    }>
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

export const convexApi = {
  workspaces: {
    bootstrap: mutationRef<
      {
        clerkOrgId: string
        slug: string
        name: string
        userName?: string
        userFirstName?: string
        userLastName?: string
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
    memberProfile: queryRef<
      { workspaceSlug: string; userId: string },
      MemberProfileData | null
    >("workspaces:memberProfile"),
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
    clubOperations: queryRef<
      { workspaceSlug: string; slug: string },
      ClubOperationsData | null
    >("chat:clubOperations"),
    createChannel: mutationRef<
      { workspaceSlug: string; name: string; description?: string },
      { channelId: string; slug: string }
    >("chat:createChannel"),
    createClubEvent: mutationRef<
      {
        workspaceSlug: string
        slug: string
        title: string
        summary?: string
        date: string
        time: string
        location: string
      },
      { eventId: string }
    >("chat:createClubEvent"),
    joinClubEvent: mutationRef<
      {
        workspaceSlug: string
        slug: string
        eventId: string
      },
      { ticketId: string; code: string }
    >("chat:joinClubEvent"),
    checkInClubTicket: mutationRef<
      {
        workspaceSlug: string
        slug: string
        ticketId: string
      },
      null
    >("chat:checkInClubTicket"),
    resetClubTicket: mutationRef<
      {
        workspaceSlug: string
        slug: string
        ticketId: string
      },
      null
    >("chat:resetClubTicket"),
    createClubPoll: mutationRef<
      {
        workspaceSlug: string
        slug: string
        question: string
        description?: string
        options: string[]
      },
      { pollId: string }
    >("chat:createClubPoll"),
    voteOnClubPoll: mutationRef<
      {
        workspaceSlug: string
        slug: string
        pollId: string
        optionId: string
      },
      null
    >("chat:voteOnClubPoll"),
    setClubPollStatus: mutationRef<
      {
        workspaceSlug: string
        slug: string
        pollId: string
        status: "open" | "closed"
      },
      null
    >("chat:setClubPollStatus"),
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
  whiteboard: {
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
  },
}
