"use client"

import Link from "next/link"
import { ArrowLeftIcon, MessageCircleIcon, TicketIcon, UsersIcon } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import {
  workspaceClubPath,
  workspaceMessagePath,
  workspacePeoplePath,
} from "@/lib/workspaces"
import { channelsApi } from "@/modules/channels/api"
import { formatShortDate } from "@/modules/channels/components/conversation-utils"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { workspaceApi } from "@/modules/workspace/api"

function formatJoinedDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

function formatLastSeen(timestamp: number | null, isActive: boolean) {
  if (isActive) {
    return "Active now"
  }

  if (!timestamp) {
    return "No recent activity"
  }

  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (minutes < 60) {
    return `Last seen ${minutes} min ago`
  }

  if (minutes < 1_440) {
    return `Last seen ${Math.round(minutes / 60)} hr ago`
  }

  return `Last seen ${Math.round(minutes / 1_440)} day ago`
}

function formatTicketStatus(ticket: {
  status: "pending" | "approved" | "rejected"
  checkedInAt: number | null
}) {
  if (ticket.checkedInAt) {
    return "Checked in"
  }

  if (ticket.status === "pending") {
    return "Pending approval"
  }

  if (ticket.status === "rejected") {
    return "Rejected"
  }

  return "Issued"
}

export function LiveMemberProfilePage({
  workspaceSlug,
  userId,
}: {
  workspaceSlug: string
  userId: string
}) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Profiles need Convex."
        body="Add your deployment URL and run Convex to load this member page."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveMemberProfilePageInner workspaceSlug={workspaceSlug} userId={userId} />
    </ConvexAuthGate>
  )
}

function LiveMemberProfilePageInner({
  workspaceSlug,
  userId,
}: {
  workspaceSlug: string
  userId: string
}) {
  const router = useRouter()
  const profile = useQuery(workspaceApi.memberProfile, { workspaceSlug, userId })
  const directory = useQuery(workspaceApi.directory, { workspaceSlug })
  const createDirectMessage = useMutation(channelsApi.createDirectMessage)

  if (profile === undefined || directory === undefined) {
    return (
      <LiveLoadingState
        title="Loading profile"
        body="Syncing member details, memberships, and recent activity."
      />
    )
  }

  if (!profile || !directory) {
    return (
      <div className="do-surface p-6 md:p-8 lg:p-10">
        <p className="do-eyebrow">Member missing</p>
        <h2 className="mt-3 do-subheading">This member profile is not available.</h2>
      </div>
    )
  }

  const directoryEntry =
    directory.members.find((member) => member.id === profile.id) ?? null
  const isCurrentUser = directoryEntry?.isCurrentUser ?? false

  const handleOpenMessage = async () => {
    try {
      const result = await createDirectMessage({ workspaceSlug, userId })
      router.push(workspaceMessagePath(workspaceSlug, result.slug))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open a direct message for this member."
      )
    }
  }

  return (
    <div className="space-y-6">
      <section className="do-surface overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href={workspacePeoplePath(workspaceSlug)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit text-tan")}
            >
              <ArrowLeftIcon className="size-4" />
              People
            </Link>
            <div className="mt-5 flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[18px] font-medium text-cream">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[30px] font-semibold tracking-tight text-cream">
                    {profile.name}
                  </h2>
                  {isCurrentUser ? <span className="do-pill">You</span> : null}
                  <PresenceDot
                    status={directoryEntry?.isActive ? "online" : "offline"}
                    className="size-2.5"
                  />
                </div>
                <p className="mt-2 text-[14px] leading-7 text-tan">
                  {profile.workspaceRole === "admin" ? "College admin" : "Student member"}
                  {" · "}
                  {formatLastSeen(
                    directoryEntry?.lastSeenAt ?? null,
                    directoryEntry?.isActive ?? false
                  )}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-tan">
                  Joined {profile.workspaceName} on {formatJoinedDate(profile.joinedAt)}
                </p>
              </div>
            </div>
          </div>

          {!isCurrentUser ? (
            <Button onClick={handleOpenMessage} className="w-full sm:w-auto">
              <MessageCircleIcon className="size-4" />
              Message {profile.firstName || profile.name}
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-6">
          <section className="do-panel p-5">
            <p className="do-eyebrow">Profile</p>
            <h3 className="mt-2 text-[22px] font-medium text-cream">Member details</h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                <p className="do-eyebrow">First Name</p>
                <p className="mt-2 text-[15px] font-medium text-cream">
                  {profile.firstName || "Not set"}
                </p>
              </div>
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                <p className="do-eyebrow">Last Name</p>
                <p className="mt-2 text-[15px] font-medium text-cream">
                  {profile.lastName || "Not set"}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-[20px] border border-hairline bg-surface/55 p-4">
              <p className="do-eyebrow">Email</p>
              <p className="mt-2 break-all text-[14px] font-medium text-cream">
                {profile.email ?? "No email synced"}
              </p>
            </div>
          </section>

          <section className="do-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="do-eyebrow">Clubs</p>
                <h3 className="mt-2 text-[22px] font-medium text-cream">
                  Club memberships
                </h3>
              </div>
              <span className="do-pill">
                <UsersIcon className="size-3.5" />
                {profile.clubMemberships.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {profile.clubMemberships.length ? (
                profile.clubMemberships.map((membership) => (
                  <Link
                    key={membership.id}
                    href={workspaceClubPath(workspaceSlug, membership.slug)}
                    className="do-card block p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium text-cream">{membership.name}</p>
                      <span className="do-pill">{membership.role}</span>
                    </div>
                    <p className="mt-2 text-[12px] leading-6 text-tan">
                      Joined {formatShortDate(membership.joinedAt)}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  No club memberships recorded yet.
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="do-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="do-eyebrow">Tickets</p>
                <h3 className="mt-2 text-[20px] font-medium text-cream">
                  Event history
                </h3>
              </div>
              <span className="do-pill">
                <TicketIcon className="size-3.5" />
                {profile.eventTickets.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {profile.eventTickets.length ? (
                profile.eventTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-[20px] border border-hairline bg-surface/55 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium text-cream">
                        {ticket.eventTitle}
                      </p>
                      {ticket.code ? <span className="do-pill">{ticket.code}</span> : null}
                      <span className="do-pill">{formatTicketStatus(ticket)}</span>
                    </div>
                    <p className="mt-2 text-[12px] leading-6 text-tan">
                      {ticket.clubName} · Requested {formatShortDate(ticket.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  No event tickets issued for this member yet.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
