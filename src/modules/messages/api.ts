import { mutationRef, queryRef } from "@/modules/core/convex/ref"
import type { MessageData } from "@/modules/channels/api"

export type DirectMessageListData = {
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

export type DirectMessageConversationData = {
  slug: string
  name: string
  description: string
  canViewMessages: boolean
  canPostMessages: boolean
  otherMember: {
    id: string
    name: string
    imageUrl: string | null
    joinedAt: number
    isCurrentUser: boolean
  } | null
}

export const messagesApi = {
  listDirectMessages: queryRef<
    { workspaceSlug: string },
    DirectMessageListData
  >("chat:listDirectMessages"),
  directMessageConversation: queryRef<
    { workspaceSlug: string; slug: string },
    DirectMessageConversationData | null
  >("chat:directMessageConversation"),
  listDirectMessageMessages: queryRef<
    { workspaceSlug: string; slug: string },
    MessageData[]
  >("chat:listDirectMessageMessages"),
  openDirectMessage: mutationRef<
    { workspaceSlug: string; userId: string },
    { slug: string }
  >("chat:createDirectMessage"),
  sendDirectMessage: mutationRef<
    { workspaceSlug: string; slug: string; body: string },
    null
  >("chat:sendMessage"),
  markDirectMessageRead: mutationRef<
    { workspaceSlug: string; slug: string },
    null
  >("chat:markConversationRead"),
}
