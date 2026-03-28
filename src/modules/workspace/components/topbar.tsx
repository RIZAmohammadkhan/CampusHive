"use client"

import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs"
import { ShieldCheckIcon } from "lucide-react"
import { useConvexAuth, useQuery } from "convex/react"
import { usePathname } from "next/navigation"

import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { WORKSPACE_HOME_PATTERN } from "@/lib/workspaces"
import { workspaceApi } from "@/modules/workspace/api"
import { getWorkspaceSection } from "@/modules/workspace/sections"

type AppTopbarProps = {
  workspaceSlug: string
}

export function AppTopbar({ workspaceSlug }: AppTopbarProps) {
  const pathname = usePathname() ?? "/"
  const enabled = useConvexConfigured()
  const { isAuthenticated } = useConvexAuth()
  const queryArgs = enabled && isAuthenticated ? { workspaceSlug } : "skip"
  const viewer = useQuery(workspaceApi.viewer, queryArgs)
  const content = getWorkspaceSection(pathname, workspaceSlug) ?? {
    title: "Campus Space",
    subtitle: "Live campus data is loaded for the current organization.",
  }
  const { organization } = useOrganization()
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date())
  const roleLabel =
    viewer?.role === "admin"
      ? "College admin"
      : viewer?.role === "member"
        ? "Student member"
        : "Campus access"

  return (
    <header className="sticky top-0 z-20 border-b border-hairline/80 bg-background/60 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="do-pill">{organization?.slug ?? workspaceSlug}</span>
              <span className="do-pill">{today}</span>
              <span className="do-pill">
                <ShieldCheckIcon className="size-3.5" />
                {roleLabel}
              </span>
            </div>
            <div>
              <h1 className="font-display text-[26px] leading-none text-cream">
                {content.title}
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-tan">
                {content.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl={WORKSPACE_HOME_PATTERN}
              afterSelectOrganizationUrl={WORKSPACE_HOME_PATTERN}
            />
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}
