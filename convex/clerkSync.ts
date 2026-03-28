"use node"

import { actionGeneric } from "convex/server"
import { v } from "convex/values"

import { internal } from "./_generated/api"
import { getActiveOrganization } from "./lib/auth"

type ClerkEmailAddress = {
  id: string
  email_address: string
}

type ClerkUser = {
  id: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
  primary_email_address_id: string | null
  email_addresses: ClerkEmailAddress[]
}

function requireClerkSecret() {
  const secret = process.env.CLERK_SECRET_KEY

  if (!secret) {
    throw new Error(
      "CLERK_SECRET_KEY is not configured in the Convex environment."
    )
  }

  return secret
}

async function fetchClerkJson<T>(path: string, options?: { allowNotFound?: boolean }) {
  const response = await fetch(`https://api.clerk.com${path}`, {
    headers: {
      Authorization: `Bearer ${requireClerkSecret()}`,
      "Content-Type": "application/json",
    },
  })

  if (response.status === 404 && options?.allowNotFound) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Clerk request failed (${response.status}) for ${path}`)
  }

  return (await response.json()) as T
}

export const repairMemberProfilesFromClerk = actionGeneric({
  args: {
    workspaceSlug: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    repairedCount: number
  }> => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Not authenticated")
    }

    const activeOrganization = getActiveOrganization(identity)

    if (!activeOrganization.id) {
      throw new Error("Active Clerk organization is required for member sync.")
    }

    const membershipResponse = await fetchClerkJson<{
      data: Array<{ public_user_data?: { user_id?: string | null } | null }>
    }>(`/v1/organizations/${activeOrganization.id}/memberships?limit=100`, {
      allowNotFound: true,
    })

    if (!membershipResponse) {
      return { repairedCount: 0 }
    }
    const userIds = membershipResponse.data
      .map((membership) => membership.public_user_data?.user_id ?? null)
      .filter((value): value is string => Boolean(value))

    if (!userIds.length) {
      return { repairedCount: 0 }
    }

    const users = (
      await Promise.all(
        userIds.map(
          async (userId) =>
            await fetchClerkJson<ClerkUser>(`/v1/users/${userId}`, {
              allowNotFound: true,
            })
        )
      )
    ).filter((user): user is ClerkUser => Boolean(user))

    const repairedCount: number = await ctx.runMutation(
      internal.workspaces.applyClerkMemberProfiles,
      {
        clerkOrgId: activeOrganization.id,
        workspaceSlug: args.workspaceSlug,
        profiles: users.map((user) => {
          const primaryEmail =
            user.email_addresses.find(
              (email) => email.id === user.primary_email_address_id
            )?.email_address ?? user.email_addresses[0]?.email_address

          return {
            externalId: user.id,
            name: [user.first_name, user.last_name].filter(Boolean).join(" ") || undefined,
            firstName: user.first_name ?? undefined,
            lastName: user.last_name ?? undefined,
            email: primaryEmail,
            imageUrl: user.image_url ?? undefined,
          }
        }),
      }
    )

    return { repairedCount }
  },
})
