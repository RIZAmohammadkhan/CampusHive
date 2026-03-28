"use client"

import type { ReactNode } from "react"
import { useConvexAuth } from "convex/react"

import { LiveLoadingState } from "@/components/app/live-loading-state"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"

export function ConvexAuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()

  if (isLoading) {
    return (
      <LiveLoadingState
        title="Connecting your Convex session"
        body="Waiting for Clerk to hand Convex an authenticated campus token."
      />
    )
  }

  if (!isAuthenticated) {
    return (
      <ConvexSetupNotice
        title="Convex is not receiving a Clerk auth token yet."
        body="Make sure you are signed in, the Clerk Convex integration or a JWT template named `convex` is configured, and then refresh the page."
      />
    )
  }

  return <>{children}</>
}
