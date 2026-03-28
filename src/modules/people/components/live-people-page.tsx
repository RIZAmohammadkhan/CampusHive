"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { MessageCircleIcon, SearchIcon } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { workspaceMessagePath, workspacePersonPath } from "@/lib/workspaces"
import { channelsApi } from "@/modules/channels/api"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { workspaceApi } from "@/modules/workspace/api"

function formatLastSeen(timestamp: number | null, isActive: boolean) {
  if (isActive) {
    return "Active now"
  }

  if (!timestamp) {
    return "No recent activity"
  }

  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (minutes < 60) {
    return `Seen ${minutes} min ago`
  }

  if (minutes < 1_440) {
    return `Seen ${Math.round(minutes / 60)} hr ago`
  }

  return `Seen ${Math.round(minutes / 1_440)} day ago`
}

export function LivePeoplePage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="People profiles need Convex."
        body="Add your deployment URL and run Convex to load member details."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LivePeoplePageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LivePeoplePageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter()
  const directory = useQuery(workspaceApi.directory, { workspaceSlug })
  const createDirectMessage = useMutation(channelsApi.createDirectMessage)
  const [search, setSearch] = useState("")
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (directory === undefined) {
    return (
      <LiveLoadingState
        title="Loading people"
        body="Syncing member profiles and activity."
      />
    )
  }

  if (directory === null) {
    return (
      <LiveLoadingState
        title="Preparing directory"
        body="This usually resolves in a moment."
      />
    )
  }

  const normalizedSearch = search.trim().toLowerCase()
  const members = directory.members.filter((member) =>
    `${member.name} ${member.email ?? ""} ${member.role}`
      .toLowerCase()
      .includes(normalizedSearch)
  )
  const activeCount = directory.members.filter((member) => member.isActive).length
  const adminCount = directory.members.filter((member) => member.role === "admin").length

  const messageMember = (userId: string) => {
    setPendingUserId(userId)

    startTransition(async () => {
      try {
        const result = await createDirectMessage({ workspaceSlug, userId })
        router.push(workspaceMessagePath(workspaceSlug, result.slug))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not start that conversation."
        )
      } finally {
        setPendingUserId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="do-surface overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="do-eyebrow">People</p>
            <h2 className="mt-2 do-subheading">Profiles that actually help you work.</h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-7 text-tan">
              Browse the campus directory, jump into full member pages, and start direct
              messages without losing context.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="do-card p-5">
              <p className="do-stat-label">Members</p>
              <p className="mt-4 do-stat-value">{directory.members.length}</p>
            </div>
            <div className="do-card p-5">
              <p className="do-stat-label">Active now</p>
              <p className="mt-4 do-stat-value">{activeCount}</p>
            </div>
            <div className="do-card p-5">
              <p className="do-stat-label">Admins</p>
              <p className="mt-4 do-stat-value">{adminCount}</p>
            </div>
          </div>
        </div>

        <div className="relative mt-6">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-tan" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people by name, email, or role"
            className="pl-10"
          />
        </div>
      </section>

      <section className="do-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="do-eyebrow">Directory</p>
            <h3 className="mt-2 text-[24px] font-medium text-cream">Member profiles</h3>
          </div>
          <span className="do-pill">{members.length}</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {members.length ? (
            members.map((member) => (
              <div key={member.id} className="do-card p-5">
                <div className="flex items-start gap-4">
                  <Link
                    href={workspacePersonPath(workspaceSlug, member.id)}
                    className="flex min-w-0 flex-1 items-start gap-4"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[14px] font-medium text-cream">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[16px] font-medium text-cream">
                          {member.name}
                        </span>
                        {member.isCurrentUser ? <span className="do-pill">You</span> : null}
                        <PresenceDot
                          status={member.isActive ? "online" : "offline"}
                          className="size-2.5"
                        />
                      </span>
                      <span className="mt-2 block text-[12px] leading-6 text-tan">
                        {member.role === "admin" ? "College admin" : "Student member"}
                      </span>
                      <span className="block truncate text-[12px] leading-6 text-tan">
                        {member.email ?? "No email synced"}
                      </span>
                      <span className="block text-[12px] leading-6 text-tan">
                        {formatLastSeen(member.lastSeenAt, member.isActive)}
                      </span>
                    </span>
                  </Link>
                  {!member.isCurrentUser ? (
                    <Button
                      size="sm"
                      disabled={isPending && pendingUserId === member.id}
                      onClick={() => messageMember(member.id)}
                    >
                      <MessageCircleIcon className="size-4" />
                      Message
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-6 text-[13px] leading-6 text-tan lg:col-span-2">
              No members match this search.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
