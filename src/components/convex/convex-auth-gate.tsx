"use client"

import type { ReactNode } from "react"
import { useConvexAuth } from "convex/react"

function QuietGateState() {
  return (
    <div
      className="do-surface p-6 md:p-8 lg:p-10"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="do-card h-28 animate-pulse bg-elevated/55 p-4"
          />
        ))}
      </div>
    </div>
  )
}

export function ConvexAuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()

  if (isLoading || !isAuthenticated) {
    return <QuietGateState />
  }

  return <>{children}</>
}
