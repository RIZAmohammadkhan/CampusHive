"use client"

import type { ReactNode } from "react"
import { useOrganization } from "@clerk/nextjs"
import { useConvexAuth, useQuery } from "convex/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  meta?: string
}

function SidebarLink({
  href,
  children,
  match = "exact",
  icon,
  meta,
}: SidebarLinkProps) {
  const pathname = usePathname() ?? "/"
  const isActive =
    match === "exact"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-[16px] border border-transparent px-3 py-2.5 text-[13px] text-tan transition-colors duration-200 ease-out hover:border-hairline hover:bg-field/60 hover:text-beige",
        isActive &&
          "border-hairline bg-active-row text-parchment hover:bg-active-row"
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-tan transition-colors",
              isActive && "bg-elevated text-cream"
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0">{children}</span>
      </span>
      {meta ? (
        <span className="text-[10px] tracking-[0.14em] text-tan uppercase">
          {meta}
        </span>
      ) : null}
    </Link>
  )
}

type AppSidebarProps = {
  workspaceSlug: string
}

function sidebarChannelMeta(
  membershipState:
    | "public"
    | "admin"
    | "owner"
    | "officer"
    | "member"
    | "pending"
    | "notMember"
) {
  if (membershipState === "public") return "open"
  if (membershipState === "admin") return "admin"
  if (membershipState === "owner") return "owner"
  if (membershipState === "officer") return "officer"
  if (membershipState === "member") return "joined"
  if (membershipState === "pending") return "pending"
  return "join"
}

export function AppSidebar({ workspaceSlug }: AppSidebarProps) {
  const enabled = useConvexConfigured()
  const { isAuthenticated } = useConvexAuth()
  const { organization } = useOrganization()
  const queryArgs = enabled && isAuthenticated ? { workspaceSlug } : "skip"
  const channelsData = useQuery(channelsApi.listChannels, queryArgs)
  const directoryData = useQuery(workspaceApi.directory, queryArgs)
  const workspaceName = organization?.name ?? workspaceSlug
  const workspaceInitial = workspaceName.charAt(0).toUpperCase()
  const roleLabel =
    directoryData?.currentRole === "admin" ? "College admin" : "Student member"

  return (
    <aside className="w-full shrink-0 border-b border-hairline/80 bg-panel/55 backdrop-blur-xl lg:w-[280px] lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="do-panel p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border border-hairline bg-elevated text-[15px] font-semibold text-cream">
              {workspaceInitial}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="truncate text-[16px] font-medium leading-none text-cream">
                {workspaceName}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="do-pill">{roleLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {workspaceSections.map((section) => (
            <SidebarLink
              key={section.id}
              href={workspacePath(workspaceSlug, section.href)}
              match={section.match}
              icon={<section.icon className="size-4" />}
            >
              <span>{section.navLabel}</span>
            </SidebarLink>
          ))}
        </nav>

        <div className="grid gap-4">
          <div className="do-panel p-4">
            <div className="flex items-center justify-between">
              <div className="do-eyebrow">Clubs</div>
              <span className="text-[10px] tracking-[0.14em] text-tan uppercase">
                {channelsData?.channels.length ?? 0} live
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {channelsData?.channels.length ? (
                channelsData.channels.slice(0, 6).map((channel) => (
                  <SidebarLink
                    key={channel.id}
                    href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                    match="prefix"
                    meta={sidebarChannelMeta(channel.membershipState)}
                  >
                    <span className="truncate">
                      <span className="text-tan/70">#</span> {channel.slug}
                    </span>
                  </SidebarLink>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] text-tan">
                  No clubs yet.
                </div>
              )}
            </div>
          </div>

          <div className="do-panel p-4">
            <div className="flex items-center justify-between">
              <div className="do-eyebrow">People</div>
              <span className="text-[10px] tracking-[0.14em] text-tan uppercase">
                {directoryData?.members.length ?? 0} synced
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {directoryData?.members.length ? (
                directoryData.members.slice(0, 6).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface/55 px-3 py-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                      {member.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-cream">
                        {member.name}
                      </span>
                      <span className="block text-[11px] leading-6 text-tan">
                        {member.role === "admin" ? "College admin" : "Student member"}
                        {member.isCurrentUser ? " · You" : ""}
                      </span>
                    </span>
                    <PresenceDot
                      status={member.isActive ? "online" : "offline"}
                      className="size-2.5"
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] text-tan">
                  No members yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
