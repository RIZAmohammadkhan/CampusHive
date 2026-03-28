"use client"

import { useAuth } from "@clerk/nextjs"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from "react"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

const ConvexConfigContext = createContext({
  enabled: false,
})

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      enabled: Boolean(convexClient),
    }),
    []
  )

  if (!convexClient) {
    return (
      <ConvexConfigContext.Provider value={value}>
        {children}
      </ConvexConfigContext.Provider>
    )
  }

  return (
    <ConvexConfigContext.Provider value={value}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ConvexConfigContext.Provider>
  )
}

export function useConvexConfigured() {
  return useContext(ConvexConfigContext).enabled
}
