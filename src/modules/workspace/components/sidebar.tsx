"use client"

import type { ReactNode } from "react"
import { useOrganization } from "@clerk/nextjs"
import { MessageCircleIcon, SparklesIcon } from "lucide-react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"
import { channelsApi, type ChannelListData } from "@/modules/channels/api"
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
}

function sidebarChannelMeta(channel: ChannelListData["channels"][number]) {
  if (channel.viewerClubRole === "owner") return "owner"
  if (channel.viewerClubRole === "officer") return "officer"
  if (channel.viewerClubRole === "member") return "joined"
  if (channel.membershipState === "pending") return "pending"
  if (channel.membershipState === "admin") return "admin"
  if (channel.membershipState === "public") return "open"
  return "join"
}

export function AppSidebar({ workspaceSlug }: AppSidebarProps) {
  const router = useRouter()
  const enabled = useConvexConfigured()
  const { isAuthenticated } = useConvexAuth()
  const { organization } = useOrganization()
  const queryArgs = enabled && isAuthenticated ? { workspaceSlug } : "skip"
  const channelsData = useQuery(channelsApi.listChannels, queryArgs)
  const directoryData = useQuery(workspaceApi.directory, queryArgs)
  const createDirectMessage = useMutation(channelsApi.createDirectMessage)
  const workspaceName = organization?.name ?? workspaceSlug
  const roleLabel =
    directoryData?.currentRole === "admin" ? "College admin" : "Student"
  const memberClubs =
    channelsData?.channels.filter((channel) => !channel.isGeneral && channel.viewerClubRole) ??
    []
  const pendingClubs =
    channelsData?.channels.filter(
      (channel) =>
        !channel.isGeneral &&
        channel.viewerClubRole === null &&
        channel.membershipState === "pending"
    ) ?? []
  const totalClubs =
    channelsData?.channels.filter((channel) => !channel.isGeneral).length ?? 0
  const directMessages = channelsData?.directMessages ?? []
  const unreadDirectMessages = directMessages.reduce(
    (sum, item) => sum + item.unreadCount,
    0
  )
  const currentMember =
    directoryData?.members.find((member) => member.isCurrentUser) ?? null
  const peopleQuickActions =
    directoryData?.members.filter((member) => !member.isCurrentUser).slice(0, 4) ?? []
  const sectionBadges: Partial<Record<(typeof workspaceSections)[number]["id"], string>> = {
    channels: totalClubs > 0 ? totalClubs.toString() : undefined,
    dashboard: unreadDirectMessages > 0 ? unreadDirectMessages.toString() : undefined,
  }

  return (
    <aside className="w-full shrink-0 border-b border-hairline bg-sidebar/96 lg:sticky lg:top-0 lg:h-dvh lg:w-[280px] lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col px-4 py-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(201,132,122,0.16)] bg-[linear-gradient(135deg,rgba(201,132,122,0.18),rgba(200,169,110,0.08))] text-rose">
            <SparklesIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-[26px] leading-none text-parchment">
              CampusHive
            </p>
            <p className="mt-1 truncate text-[11px] font-medium tracking-[0.08em] text-tan uppercase">
              {workspaceName}
            </p>
          </div>
        </div>

        <div className="mt-6">
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
              >
                {section.navLabel}
              </SidebarLink>
            ))}
          </nav>
        </div>

        <div className="my-5 h-px bg-hairline" />

        <div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-tan uppercase">
              Clubs
            </p>
            <CountBadge value={memberClubs.length.toString()} />
          </div>
          <div className="mt-2 space-y-0.5">
            <SidebarLink
              href={workspacePath(workspaceSlug, "/channels")}
              match="prefix"
              icon={<MessageCircleIcon className="size-4" />}
              badge={totalClubs > 0 ? totalClubs.toString() : null}
              secondary="Browse the full directory"
            >
              Discover clubs
            </SidebarLink>
            {memberClubs.length ? (
              memberClubs.slice(0, 5).map((channel) => (
                <SidebarLink
                  key={channel.id}
                  href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                  match="prefix"
                  badge={
                    channel.unreadCount > 0
                      ? channel.unreadCount > 9
                        ? "9+"
                        : channel.unreadCount.toString()
                      : null
                  }
                  secondary={sidebarChannelMeta(channel)}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="size-1 rounded-full bg-rose/80" />
                    <span className="truncate">{channel.name}</span>
                  </span>
                </SidebarLink>
              ))
            ) : (
              <p className="mt-3 px-1 text-[12px] leading-6 text-tan">
                {roleLabel === "College admin"
                  ? "Create or join a club to pin it here."
                  : "Join a club to keep it close at hand."}
              </p>
            )}
            {pendingClubs.length ? (
              <p className="mt-2 px-1 text-[11px] leading-5 text-tan">
                Pending: {pendingClubs.map((channel) => channel.name).join(", ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-tan uppercase">
              Messages
            </p>
            <CountBadge value={unreadDirectMessages.toString()} />
          </div>
          <div className="mt-2 space-y-0.5">
            {directMessages.length ? (
              directMessages.slice(0, 4).map((dm) => (
                <SidebarLink
                  key={dm.id}
                  href={workspacePath(workspaceSlug, `/channels/${dm.slug}`)}
                  match="prefix"
                  icon={<MessageCircleIcon className="size-4" />}
                  badge={
                    dm.unreadCount > 0
                      ? dm.unreadCount > 9
                        ? "9+"
                        : dm.unreadCount.toString()
                      : null
                  }
                  secondary={dm.preview}
                >
                  {dm.name}
                </SidebarLink>
              ))
            ) : (
              <p className="mt-3 px-1 text-[12px] leading-6 text-tan">
                Start a direct message from the people list.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-tan uppercase">
              People
            </p>
            <CountBadge
              value={(directoryData?.members.length ?? 0).toString()}
            />
          </div>
          <div className="mt-2 space-y-0.5">
            {peopleQuickActions.length ? (
              peopleQuickActions.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  onClick={async () => {
                    try {
                      const result = await createDirectMessage({
                        workspaceSlug,
                        userId: member.id,
                      })
                      router.push(
                        workspacePath(workspaceSlug, `/channels/${result.slug}`)
                      )
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not start that direct message."
                      )
                    }
                  }}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-hairline bg-elevated text-[12px] font-medium text-parchment">
                    {member.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium tracking-[0.03em] text-parchment">
                      {member.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-tan">
                      {member.role === "admin" ? "College admin" : "Student"}
                    </span>
                  </span>
                  <PresenceDot
                    status={member.isActive ? "online" : "offline"}
                    className="size-2.5"
                  />
                </button>
              ))
            ) : (
              <p className="mt-3 px-1 text-[12px] leading-6 text-tan">
                No members yet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="h-px bg-hairline" />
          <div className="mt-4 rounded-[10px] border border-hairline bg-elevated/92 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-hairline bg-panel text-[13px] font-medium text-parchment">
                {(currentMember?.name ?? workspaceName).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-parchment">
                  {currentMember?.name ?? "Campus member"}
                </span>
                <span className="mt-1 block text-[11px] text-tan">{roleLabel}</span>
              </span>
              <PresenceDot
                status={currentMember?.isActive ? "online" : "offline"}
                className="size-2.5"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
