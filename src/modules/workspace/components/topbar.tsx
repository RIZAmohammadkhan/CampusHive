"use client"

import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs"
import { ShieldCheckIcon } from "lucide-react"
import { useConvexAuth, useQuery } from "convex/react"
import { usePathname } from "next/navigation"

import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { WORKSPACE_HOME_PATTERN } from "@/lib/workspaces"
import { workspaceApi } from "@/modules/workspace/api"
import { NotificationCenter } from "@/modules/workspace/components/notification-center"
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
  const section =
    getWorkspaceSection(pathname, workspaceSlug) ?? {
      title: "Workspace",
      subtitle: "Live campus data.",
      navLabel: "Workspace",
    }
  const { organization } = useOrganization()
  const roleLabel =
    viewer?.role === "admin"
      ? "College admin"
      : viewer?.role === "member"
        ? "Student"
        : "Campus access"

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1360px] items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-6">
        <div className="min-w-0">
          <p className="do-eyebrow">{section.navLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[28px] font-light tracking-[-0.05em] text-parchment">
              {section.title}
            </h1>
            <span className="do-pill do-pill-gold">
              {organization?.slug ?? workspaceSlug}
            </span>
            <span className="do-pill do-pill-rose">
              <ShieldCheckIcon className="size-3.5" />
              {roleLabel}
            </span>
          </div>
          <p className="mt-2 text-[13px] text-tan">{section.subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationCenter workspaceSlug={workspaceSlug} />
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl={WORKSPACE_HOME_PATTERN}
            afterSelectOrganizationUrl={WORKSPACE_HOME_PATTERN}
          />
          <UserButton />
        </div>
      </div>
    </header>
  )
}
