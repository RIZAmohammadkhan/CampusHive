"use client"

import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { MenuIcon, ShieldCheckIcon } from "lucide-react"
import { useConvexAuth, useQuery } from "convex/react"
import { usePathname } from "next/navigation"

import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { Button } from "@/components/ui/button"
import { WORKSPACE_HOME_PATTERN } from "@/lib/workspaces"
import { workspaceApi } from "@/modules/workspace/api"
import { NotificationCenter } from "@/modules/workspace/components/notification-center"
import {
  getWorkspaceScopedPath,
  getWorkspaceSection,
} from "@/modules/workspace/sections"

type AppTopbarProps = {
  workspaceSlug: string
  onOpenSidebar?: () => void
  mobileSidebarOpen?: boolean
}

export function AppTopbar({
  workspaceSlug,
  onOpenSidebar,
  mobileSidebarOpen = false,
}: AppTopbarProps) {
  const pathname = usePathname() ?? "/"
  const enabled = useConvexConfigured()
  const { isAuthenticated } = useConvexAuth()
  const queryArgs = enabled && isAuthenticated ? { workspaceSlug } : "skip"
  const viewer = useQuery(workspaceApi.viewer, queryArgs)
  const section =
    getWorkspaceSection(pathname, workspaceSlug) ?? {
      id: "workspace",
      title: "Workspace",
      subtitle: "Live campus data.",
      navLabel: "Workspace",
    }
  const scopedPath = getWorkspaceScopedPath(pathname, workspaceSlug)
  const compactSectionHeader =
    section.id === "channels" && scopedPath.startsWith("/channels/")
  const showSectionLabel =
    !compactSectionHeader &&
    section.navLabel.trim().toLowerCase() !== section.title.trim().toLowerCase()
  const { organization } = useOrganization()
  const roleLabel =
    viewer?.role === "admin"
      ? "College admin"
      : viewer?.role === "member"
        ? "Student"
        : "Campus access"

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              {onOpenSidebar ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-0.5 lg:hidden"
                  onClick={onOpenSidebar}
                  aria-label="Open navigation"
                  aria-expanded={mobileSidebarOpen}
                >
                  <MenuIcon className="size-4" />
                </Button>
              ) : null}
              <div className="min-w-0">
                {showSectionLabel ? (
                  <p className="do-eyebrow">{section.navLabel}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {!compactSectionHeader ? (
                    <h1 className="truncate text-[24px] font-light tracking-[-0.05em] text-parchment sm:text-[28px]">
                      {section.title}
                    </h1>
                  ) : null}
                  <span className="do-pill do-pill-gold">
                    {organization?.slug ?? workspaceSlug}
                  </span>
                  <span className="do-pill do-pill-rose">
                    <ShieldCheckIcon className="size-3.5" />
                    {roleLabel}
                  </span>
                </div>
                {!compactSectionHeader ? (
                  <p className="mt-2 max-w-3xl text-[13px] leading-6 text-tan">
                    {section.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <NotificationCenter workspaceSlug={workspaceSlug} />
            <div className="max-w-full overflow-hidden rounded-[8px] border border-hairline bg-elevated/72 px-1 py-1">
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl={WORKSPACE_HOME_PATTERN}
                afterSelectOrganizationUrl={WORKSPACE_HOME_PATTERN}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
