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
import { messagesApi } from "@/modules/messages/api"
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
  const openDirectMessage = useMutation(messagesApi.openDirectMessage)
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
  const summary = `${directory.members.length} people · ${activeCount} active · ${adminCount} admins`

  const messageMember = (userId: string) => {
    setPendingUserId(userId)

    startTransition(async () => {
      try {
        const result = await openDirectMessage({ workspaceSlug, userId })
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
    <section className="do-surface overflow-hidden">
      <div className="border-b border-hairline px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="do-eyebrow">People</p>
            <h2 className="text-[28px] font-semibold tracking-tight text-cream">
              Directory
            </h2>
            <p className="text-[13px] leading-6 text-tan">{summary}</p>
          </div>

          <div className="relative w-full md:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-tan" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {members.length ? (
        <div className="divide-y divide-hairline">
          {members.map((member) => (
            <div key={member.id} className="px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={workspacePersonPath(workspaceSlug, member.id)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-cream">
                        {member.name}
                      </span>
                      {member.isCurrentUser ? (
                        <span className="text-[12px] text-tan">You</span>
                      ) : null}
                      <PresenceDot
                        status={member.isActive ? "online" : "offline"}
                        className="size-2.5"
                      />
                    </span>
                    <span className="mt-1 block truncate text-[12px] leading-5 text-tan">
                      {member.role === "admin" ? "College admin" : "Student"}
                      {member.email ? ` · ${member.email}` : ""}
                    </span>
                    <span className="block text-[12px] leading-5 text-tan">
                      {formatLastSeen(member.lastSeenAt, member.isActive)}
                    </span>
                  </span>
                </Link>
                {!member.isCurrentUser ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={isPending && pendingUserId === member.id}
                    onClick={() => messageMember(member.id)}
                  >
                    <MessageCircleIcon className="size-4" />
                    Message
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
          No members match this search.
        </div>
      )}
    </section>
  )
}
