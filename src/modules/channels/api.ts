import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type ChannelMembershipState =
  | "public"
  | "admin"
  | "owner"
  | "officer"
  | "member"
  | "pending"
  | "notMember"

export type ClubRole = "owner" | "officer" | "member"
export type DiscussionSectionReplyAccessMode = "everyone" | "selected"

export type ChannelListData = {
  currentRole: "admin" | "member"
  channels: Array<{
    id: string
    slug: string
    name: string
    description: string
    category: string
    isGeneral: boolean
    access: "public" | "members"
    memberCount: number
    messageCount: number
    lastMessageAt: number | null
    membershipState: ChannelMembershipState
    viewerClubRole: ClubRole | null
    canManage: boolean
    canOpen: boolean
    canJoin: boolean
    canRequestToJoin: boolean
    unreadCount: number
  }>
  directMessages: Array<{
    id: string
    slug: string
    name: string
    imageUrl: string | null
    preview: string
    lastMessageAt: number | null
    unreadCount: number
  }>
}

export type ConversationData = {
  slug: string
  name: string
  description: string
  category: string
  isGeneral: boolean
  kind: "channel" | "dm"
  access: "public" | "members"
  canManage: boolean
  canEditRoles: boolean
  viewerClubRole: ClubRole | null
  memberCount: number | null
  viewerMembershipState: ChannelMembershipState
  canViewMessages: boolean
  canPostMessages: boolean
  canJoin: boolean
  canRequestToJoin: boolean
  canLeave: boolean
  discussionSections: Array<{
    id: string | null
    slug: string
    name: string
    description: string | null
    messageCount: number
    lastMessageAt: number | null
    replyAccessMode: DiscussionSectionReplyAccessMode
    allowedReplyUserIds: string[]
    canReply: boolean
  }>
  members: Array<{
    id: string
    name: string
    imageUrl: string | null
    role: ClubRole
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
    capacity: number | null
    remainingCapacity: number | null
    status: "open" | "closed"
    createdAt: number
    createdByName: string
    ticketCount: number
    pendingRequestCount: number
    checkedInCount: number
    viewerRequestStatus: "pending" | "approved" | "rejected" | null
    viewerTicket: {
      id: string
      code: string
      createdAt: number
      approvedAt: number | null
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
      approvedAt: number | null
      checkedInAt: number | null
      checkedInByName: string | null
    }>
    pendingRequests: Array<{
      ticketId: string
      userId: string
      name: string
      email: string | null
      createdAt: number
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

export const channelsApi = {
  listChannels: queryRef<{ workspaceSlug: string }, ChannelListData | null>(
    "chat:listChannels"
  ),
  conversation: queryRef<
    { workspaceSlug: string; slug: string },
    ConversationData | null
  >("chat:conversation"),
  listMessages: queryRef<
    { workspaceSlug: string; slug: string; sectionSlug?: string },
    MessageData[]
  >("chat:listMessages"),
  clubOperations: queryRef<
    { workspaceSlug: string; slug: string; sectionSlug?: string },
    ClubOperationsData | null
  >("chat:clubOperations"),
  createChannel: mutationRef<
    {
      workspaceSlug: string
      name: string
      description?: string
      category?: string
      access?: "public" | "members"
    },
    { channelId: string; slug: string }
  >("chat:createChannel"),
  createDiscussionSection: mutationRef<
    {
      workspaceSlug: string
      slug: string
      name: string
      description?: string
    },
    { sectionId: string; slug: string }
  >("chat:createDiscussionSection"),
  setDiscussionSectionReplyAccess: mutationRef<
    {
      workspaceSlug: string
      slug: string
      sectionSlug: string
      replyAccessMode: DiscussionSectionReplyAccessMode
      allowedUserIds: string[]
    },
    null
  >("chat:setDiscussionSectionReplyAccess"),
  joinOpenClub: mutationRef<{ workspaceSlug: string; slug: string }, null>(
    "chat:joinOpenClub"
  ),
  createClubEvent: mutationRef<
    {
      workspaceSlug: string
      slug: string
      title: string
      summary?: string
      date: string
      time: string
      location: string
      capacity?: number
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
  issueClubTickets: mutationRef<
    {
      workspaceSlug: string
      slug: string
      eventId: string
      userIds: string[]
    },
    { issuedCount: number; skippedCount: number }
  >("chat:issueClubTickets"),
  reviewClubEventRequests: mutationRef<
    {
      workspaceSlug: string
      slug: string
      eventId: string
      ticketIds: string[]
      approve: boolean
    },
    { reviewedCount: number; skippedCount: number }
  >("chat:reviewClubEventRequests"),
  verifyClubTicket: mutationRef<
    {
      workspaceSlug: string
      slug: string
      eventId: string
      value: string
    },
    {
      valid: boolean
      canCheckIn: boolean
      status: "pending" | "approved" | "rejected" | "invalid"
      message: string
      ticketId: string | null
      attendeeName: string | null
      attendeeEmail: string | null
      code: string | null
      checkedInAt: number | null
      checkedInByName: string | null
    }
  >("chat:verifyClubTicket"),
  scanClubTicketAndCheckIn: mutationRef<
    {
      workspaceSlug: string
      slug: string
      eventId: string
      ticketId: string
      code: string
    },
    {
      valid: boolean
      canCheckIn: boolean
      status: "pending" | "approved" | "rejected" | "invalid"
      message: string
      ticketId: string | null
      attendeeName: string | null
      attendeeEmail: string | null
      code: string | null
      checkedInAt: number | null
      checkedInByName: string | null
    }
  >("chat:scanClubTicketAndCheckIn"),
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
      sectionSlug?: string
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
  requestToJoin: mutationRef<{ workspaceSlug: string; slug: string }, null>(
    "chat:requestToJoin"
  ),
  reviewJoinRequest: mutationRef<
    {
      workspaceSlug: string
      slug: string
      userId: string
      approve: boolean
    },
    null
  >("chat:reviewJoinRequest"),
  leaveChannel: mutationRef<{ workspaceSlug: string; slug: string }, null>(
    "chat:leaveChannel"
  ),
  removeMember: mutationRef<
    { workspaceSlug: string; slug: string; userId: string },
    null
  >("chat:removeMember"),
  setMemberRole: mutationRef<
    {
      workspaceSlug: string
      slug: string
      userId: string
      role: ClubRole
    },
    null
  >("chat:setMemberRole"),
  sendMessage: mutationRef<
    { workspaceSlug: string; slug: string; sectionSlug?: string; body: string },
    null
  >("chat:sendMessage"),
  createDirectMessage: mutationRef<
    { workspaceSlug: string; userId: string },
    { slug: string }
  >("chat:createDirectMessage"),
  markConversationRead: mutationRef<
    { workspaceSlug: string; slug: string },
    null
  >("chat:markConversationRead"),
}
