import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const workspaceRole = v.union(v.literal("admin"), v.literal("member"))
const conversationKind = v.union(v.literal("channel"), v.literal("dm"))
const conversationAccess = v.union(v.literal("public"), v.literal("members"))
const conversationMemberRole = v.union(
  v.literal("owner"),
  v.literal("officer"),
  v.literal("member")
)
const joinRequestStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
)
const taskColumn = v.union(v.literal("now"), v.literal("next"), v.literal("later"))
const taskPriority = v.union(v.literal("High"), v.literal("Medium"), v.literal("Low"))
const taskStatus = v.union(
  v.literal("acknowledged"),
  v.literal("inProgress"),
  v.literal("done"),
  v.literal("flagged")
)
const taskKind = v.union(v.literal("assigned"), v.literal("volunteer"))
const eventStatus = v.union(v.literal("open"), v.literal("closed"))
const pollStatus = v.union(v.literal("open"), v.literal("closed"))

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    name: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    isSeed: v.boolean(),
  }).index("by_external_id", ["externalId"]),

  workspaces: defineTable({
    clerkOrgId: v.string(),
    slug: v.string(),
    name: v.string(),
    createdAt: v.optional(v.number()),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_slug", ["slug"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: workspaceRole,
    joinedAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_workspace_and_role", ["workspaceId", "role"])
    .index("by_user_and_workspace", ["userId", "workspaceId"]),

  conversations: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    kind: conversationKind,
    access: v.optional(conversationAccess),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.optional(v.number()),
  }).index("by_workspace_and_slug", ["workspaceId", "slug"]),

  conversationMembers: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.optional(conversationMemberRole),
    joinedAt: v.number(),
  })
    .index("by_conversation_and_user", ["conversationId", "userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user_and_conversation", ["userId", "conversationId"]),

  conversationJoinRequests: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    status: joinRequestStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("users")),
  })
    .index("by_conversation_and_user", ["conversationId", "userId"])
    .index("by_conversation_and_status", ["conversationId", "status"]),

  clubDiscussionSections: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    createdAt: v.number(),
    createdByUserId: v.optional(v.id("users")),
  })
    .index("by_conversation_and_slug", ["conversationId", "slug"])
    .index("by_conversation_and_position", ["conversationId", "position"]),

  messages: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    sectionId: v.optional(v.id("clubDiscussionSections")),
    authorId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversation_and_created_at", ["conversationId", "createdAt"])
    .index("by_workspace_and_created_at", ["workspaceId", "createdAt"]),

  presence: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    route: v.string(),
    room: v.string(),
    lastSeenAt: v.number(),
  })
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_workspace_and_last_seen_at", ["workspaceId", "lastSeenAt"]),

  rooms: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.string(),
    name: v.string(),
    mode: v.string(),
    note: v.string(),
    order: v.number(),
    active: v.boolean(),
  })
    .index("by_workspace_and_slug", ["workspaceId", "slug"])
    .index("by_workspace_and_order", ["workspaceId", "order"]),

  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    eventId: v.optional(v.id("events")),
    taskKind: v.optional(taskKind),
    title: v.string(),
    column: taskColumn,
    status: v.optional(taskStatus),
    ownerName: v.string(),
    dueLabel: v.string(),
    priority: taskPriority,
    order: v.number(),
    description: v.optional(v.string()),
    assigneeUserId: v.optional(v.id("users")),
    createdByUserId: v.optional(v.id("users")),
    completedAt: v.optional(v.number()),
    completedByUserId: v.optional(v.id("users")),
    completionNote: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_workspace_and_column_order", ["workspaceId", "column", "order"]),

  events: defineTable({
    workspaceId: v.id("workspaces"),
    dayKey: v.string(),
    dayName: v.string(),
    dateLabel: v.string(),
    time: v.string(),
    title: v.string(),
    type: v.string(),
    location: v.string(),
    order: v.number(),
  }).index("by_workspace_and_day_order", ["workspaceId", "dayKey", "order"]),

  clubEvents: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    title: v.string(),
    summary: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    status: eventStatus,
    createdAt: v.number(),
    createdByUserId: v.id("users"),
  })
    .index("by_conversation_and_created_at", ["conversationId", "createdAt"])
    .index("by_workspace_and_created_at", ["workspaceId", "createdAt"]),

  clubEventTickets: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    eventId: v.id("clubEvents"),
    userId: v.id("users"),
    code: v.string(),
    createdAt: v.number(),
    checkedInAt: v.optional(v.number()),
    checkedInByUserId: v.optional(v.id("users")),
  })
    .index("by_event_and_user", ["eventId", "userId"])
    .index("by_event_and_created_at", ["eventId", "createdAt"])
    .index("by_workspace_and_code", ["workspaceId", "code"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

  clubPolls: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    question: v.string(),
    description: v.optional(v.string()),
    status: pollStatus,
    options: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
      })
    ),
    createdAt: v.number(),
    createdByUserId: v.id("users"),
  }).index("by_conversation_and_created_at", ["conversationId", "createdAt"]),

  clubPollVotes: defineTable({
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    pollId: v.id("clubPolls"),
    userId: v.id("users"),
    optionId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_poll_and_user", ["pollId", "userId"])
    .index("by_poll", ["pollId"]),
})
