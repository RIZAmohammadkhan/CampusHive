"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useAction, useConvexAuth, useMutation } from "convex/react"
import { usePathname } from "next/navigation"
import { useEffect, useEffectEvent } from "react"

import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { presenceApi } from "@/modules/presence/api"
import { workspaceApi } from "@/modules/workspace/api"
import {
  getWorkspaceRoom,
  getWorkspaceScopedPath,
} from "@/modules/workspace/sections"

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function debugNamePayload(user: ReturnType<typeof useUser>["user"]) {
  return {
    id: user?.id,
    fullName: user?.fullName,
    firstName: user?.firstName,
    lastName: user?.lastName,
    username: user?.username,
    normalized: {
      userName:
        normalizeOptionalString(user?.fullName) ??
        normalizeOptionalString(user?.username),
      userFirstName: normalizeOptionalString(user?.firstName),
      userLastName: normalizeOptionalString(user?.lastName),
    },
  }
}

function buildUserSyncPayload(user: ReturnType<typeof useUser>["user"]) {
  return {
    userName:
      normalizeOptionalString(user?.fullName) ??
      normalizeOptionalString(user?.username),
    userFirstName: normalizeOptionalString(user?.firstName),
    userLastName: normalizeOptionalString(user?.lastName),
    userEmail: normalizeOptionalString(user?.primaryEmailAddress?.emailAddress),
    userImageUrl: normalizeOptionalString(user?.imageUrl),
  }
}

function isActiveOrganizationMismatchError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Active Clerk organization")
  )
}

function WorkspaceRuntimeInner({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname() ?? `/w/${workspaceSlug}`
  const { organization } = useOrganization()
  const { user, isLoaded } = useUser()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const bootstrapWorkspace = useMutation(workspaceApi.bootstrap)
  const heartbeat = useMutation(presenceApi.heartbeat)
  const repairMemberProfilesFromClerk = useAction(
    workspaceApi.repairMemberProfilesFromClerk
  )
  const scopedPath = getWorkspaceScopedPath(pathname, workspaceSlug)
  const activeOrganizationSlug = normalizeOptionalString(organization?.slug)
  const isWorkspaceOrganizationReady =
    Boolean(organization?.id) &&
    Boolean(activeOrganizationSlug) &&
    activeOrganizationSlug === workspaceSlug

  const runBootstrap = useEffectEvent(async () => {
    if (
      !isLoaded ||
      !isAuthenticated ||
      !organization ||
      !user ||
      !isWorkspaceOrganizationReady ||
      !activeOrganizationSlug
    ) {
      return
    }

    const payload = {
      clerkOrgId: organization.id,
      slug: activeOrganizationSlug,
      name: organization.name,
      ...buildUserSyncPayload(user),
    }

    console.groupCollapsed("[auth-debug] Clerk -> Convex bootstrap")
    console.log("workspaceSlug", workspaceSlug)
    console.log("organization", {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    })
    console.log("clerkUser", debugNamePayload(user))
    console.log("bootstrapPayload", payload)
    console.groupEnd()

    try {
      const result = await bootstrapWorkspace(payload)
      console.log("[auth-debug] bootstrap result", result)
    } catch (error) {
      console.error("[auth-debug] bootstrap failed", error)
      throw error
    }
  })

  const runHeartbeat = useEffectEvent(async () => {
    if (
      !isAuthenticated ||
      !organization ||
      !user ||
      document.visibilityState === "hidden" ||
      !isWorkspaceOrganizationReady
    ) {
      return
    }

    try {
      await heartbeat({
        workspaceSlug,
        route: scopedPath,
        room: getWorkspaceRoom(pathname, workspaceSlug),
        ...buildUserSyncPayload(user),
      })
    } catch (error) {
      if (!isActiveOrganizationMismatchError(error)) {
        throw error
      }
    }
  })

  const runMemberRepair = useEffectEvent(async () => {
    if (
      !isLoaded ||
      !isAuthenticated ||
      !organization ||
      !user ||
      !isWorkspaceOrganizationReady
    ) {
      return
    }

    const storageKey = `workspace-member-repair:${organization.id}:${workspaceSlug}`

    if (window.sessionStorage.getItem(storageKey) === "done") {
      return
    }

    try {
      await repairMemberProfilesFromClerk({ workspaceSlug })
      window.sessionStorage.setItem(storageKey, "done")
    } catch (error) {
      if (isActiveOrganizationMismatchError(error)) {
        return
      }

      console.error("[auth-debug] member repair failed", error)
    }
  })

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isWorkspaceOrganizationReady) {
      return
    }

    void runBootstrap()
    void runMemberRepair()
  }, [
    workspaceSlug,
    activeOrganizationSlug,
    isWorkspaceOrganizationReady,
    organization?.id,
    organization?.slug,
    organization?.name,
    user?.id,
    user?.fullName,
    user?.firstName,
    user?.lastName,
    user?.username,
    user?.primaryEmailAddress?.emailAddress,
    user?.imageUrl,
    isLoaded,
    isAuthenticated,
    isLoading,
  ])

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !organization ||
      !user ||
      !isWorkspaceOrganizationReady
    ) {
      return
    }

    void runHeartbeat()

    const interval = window.setInterval(() => {
      void runHeartbeat()
    }, 15_000)

    const onVisibilityChange = () => {
      void runHeartbeat()
    }

    window.addEventListener("focus", onVisibilityChange)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onVisibilityChange)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [
    organization,
    user,
    scopedPath,
    workspaceSlug,
    isAuthenticated,
    isLoading,
    isWorkspaceOrganizationReady,
  ])

  return null
}

export function WorkspaceRuntime({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return null
  }

  return <WorkspaceRuntimeInner workspaceSlug={workspaceSlug} />
}
