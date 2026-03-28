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

    await bootstrapWorkspace({
      clerkOrgId: organization.id,
      slug: organization.slug ?? workspaceSlug,
      name: organization.name,
      userName: user.fullName ?? user.username ?? undefined,
      userFirstName: user.firstName ?? undefined,
      userLastName: user.lastName ?? undefined,
      userEmail: user.primaryEmailAddress?.emailAddress,
      userImageUrl: user.imageUrl,
    })
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
