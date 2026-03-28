import { actionRef, mutationRef, queryRef } from "@/modules/core/convex/ref"

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
    code: string | null
    status: "pending" | "approved" | "rejected"
    eventTitle: string
    clubName: string
    createdAt: number
    approvedAt: number | null
    checkedInAt: number | null
  }>
}

export const workspaceApi = {
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
  repairMemberProfilesFromClerk: actionRef<
    { workspaceSlug: string },
    { repairedCount: number }
  >("clerkSync:repairMemberProfilesFromClerk"),
}
