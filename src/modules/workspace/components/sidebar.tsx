"use client"

import type { ReactNode } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { useConvexAuth, useQuery } from "convex/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftCloseIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"
import { channelsApi } from "@/modules/channels/api"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { workspaceApi } from "@/modules/workspace/api"
import { workspaceSections } from "@/modules/workspace/sections"

type SidebarLinkProps = {
  href: string
  children: ReactNode
  match?: "exact" | "prefix"
  icon?: ReactNode
  badge?: string | null
  secondary?: string | null
  onNavigate?: () => void
}

function CountBadge({
  value,
  active = false,
}: {
  value: string
  active?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.03em]",
        active
          ? "border-[rgba(201,132,122,0.2)] bg-[rgba(201,132,122,0.14)] text-rose"
          : "border-hairline bg-[rgba(255,255,255,0.03)] text-platinum"
      )}
    >
      {value}
    </span>
  )
}

function SidebarLink({
  href,
  children,
  match = "exact",
  icon,
  badge,
  secondary,
  onNavigate,
}: SidebarLinkProps) {
  const pathname = usePathname() ?? "/"
  const isActive =
    match === "exact"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[12px] font-medium tracking-[0.03em] text-tan transition-all duration-200 hover:bg-white/[0.04] hover:text-parchment",
        isActive &&
          "bg-active-row text-parchment before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[linear-gradient(135deg,var(--rose),var(--gold))]"
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center text-tan transition-colors group-hover:text-parchment",
            isActive && "text-rose"
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {secondary ? (
          <span className="mt-0.5 block truncate text-[11px] font-normal tracking-normal text-tan">
            {secondary}
          </span>
        ) : null}
      </span>
      {badge ? <CountBadge value={badge} active={isActive} /> : null}
    </Link>
  )
}

type AppSidebarProps = {
  workspaceSlug: string
  onCloseMobileMenu?: () => void
  showMobileClose?: boolean
}

export function AppSidebar({
  workspaceSlug,
  onCloseMobileMenu,
  showMobileClose = false,
}: AppSidebarProps) {
  const enabled = useConvexConfigured()
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const queryArgs = enabled && isAuthenticated ? { workspaceSlug } : "skip"
  const channelsData = useQuery(channelsApi.listChannels, queryArgs)
  const directoryData = useQuery(workspaceApi.directory, queryArgs)
  const roleLabel =
    directoryData?.currentRole === "admin" ? "College admin" : "Student"
  const totalClubs =
    channelsData?.channels.filter((channel) => !channel.isGeneral).length ?? 0
  const directMessages = channelsData?.directMessages ?? []
  const unreadDirectMessages = directMessages.reduce(
    (sum, item) => sum + item.unreadCount,
    0
  )
  const currentMember =
    directoryData?.members.find((member) => member.isCurrentUser) ?? null
  const accountName =
    user?.fullName?.trim() ||
    currentMember?.name ||
    user?.username ||
    "Campus member"
  const accountEmail =
    user?.primaryEmailAddress?.emailAddress ??
    currentMember?.email ??
    null
  const sectionBadges: Partial<Record<(typeof workspaceSections)[number]["id"], string>> = {
    messages: unreadDirectMessages > 0 ? unreadDirectMessages.toString() : undefined,
    channels: totalClubs > 0 ? totalClubs.toString() : undefined,
    people:
      directoryData?.members.length && directoryData.members.length > 0
        ? directoryData.members.length.toString()
        : undefined,
  }

  return (
    <aside className="h-full w-full shrink-0 border-r border-hairline bg-sidebar/96 shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:sticky lg:top-0 lg:h-dvh lg:w-[280px] lg:shadow-none">
      <div className="flex h-full min-h-0 flex-col px-4 py-4">
        {showMobileClose ? (
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-4 lg:hidden">
            <div>
              <p className="do-eyebrow">Workspace</p>
              <p className="mt-1 text-[14px] font-medium text-parchment">
                Campus navigation
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onCloseMobileMenu}
              aria-label="Close navigation"
            >
              <PanelLeftCloseIcon className="size-4" />
            </Button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="px-1 text-[11px] font-semibold tracking-[0.08em] text-tan uppercase">
            Navigate
          </p>
          <nav className="mt-2 space-y-0.5">
            {workspaceSections.map((section) => (
              <SidebarLink
                key={section.id}
                href={workspacePath(workspaceSlug, section.href)}
                match={section.match}
                icon={<section.icon className="size-4" />}
                badge={sectionBadges[section.id] ?? null}
                onNavigate={onCloseMobileMenu}
              >
                {section.navLabel}
              </SidebarLink>
            ))}
          </nav>
        </div>

        <div className="pt-5">
          <div className="h-px bg-hairline" />
          <div className="mt-4 rounded-[10px] border border-hairline bg-elevated/92 p-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <UserButton />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-parchment">
                  {accountName}
                </span>
                <span className="mt-1 block truncate text-[11px] text-tan">
                  {accountEmail ?? roleLabel}
                </span>
              </span>
              <PresenceDot
                status={currentMember?.isActive ? "online" : "offline"}
                className="size-2.5"
              />
            </div>
            <p className="mt-3 text-[11px] text-tan">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
