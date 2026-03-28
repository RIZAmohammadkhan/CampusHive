"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useConvexAuth, useMutation } from "convex/react"
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

function WorkspaceRuntimeInner({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname() ?? `/w/${workspaceSlug}`
  const { organization } = useOrganization()
  const { user, isLoaded } = useUser()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const bootstrapWorkspace = useMutation(workspaceApi.bootstrap)
  const heartbeat = useMutation(presenceApi.heartbeat)
  const scopedPath = getWorkspaceScopedPath(pathname, workspaceSlug)

  const runBootstrap = useEffectEvent(async () => {
    if (!isLoaded || !isAuthenticated || !organization || !user) {
      return
    }

    const payload = {
      clerkOrgId: organization.id,
      slug: organization.slug ?? workspaceSlug,
      name: organization.name,
      userName:
        normalizeOptionalString(user.fullName) ??
        normalizeOptionalString(user.username),
      userFirstName: normalizeOptionalString(user.firstName),
      userLastName: normalizeOptionalString(user.lastName),
      userEmail: normalizeOptionalString(user.primaryEmailAddress?.emailAddress),
      userImageUrl: normalizeOptionalString(user.imageUrl),
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
      document.visibilityState === "hidden"
    ) {
      return
    }

    await heartbeat({
      workspaceSlug,
      route: scopedPath,
      room: getWorkspaceRoom(pathname, workspaceSlug),
    })
  })

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return
    }

    void runBootstrap()
  }, [
    workspaceSlug,
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
    if (isLoading || !isAuthenticated || !organization || !user) {
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
  }, [organization, user, scopedPath, workspaceSlug, isAuthenticated, isLoading])

  return null
}

export function WorkspaceRuntime({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return null
  }

  return <WorkspaceRuntimeInner workspaceSlug={workspaceSlug} />
}
