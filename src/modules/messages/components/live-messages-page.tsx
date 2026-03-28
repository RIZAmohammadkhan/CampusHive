"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { SearchIcon } from "lucide-react"
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
import { formatRelativeActivity } from "@/modules/channels/components/conversation-utils"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { workspaceApi } from "@/modules/workspace/api"

function matchesSearch(values: Array<string | null | undefined>, search: string) {
  if (!search) {
    return true
  }

  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search)
}

export function LiveMessagesPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Messages need Convex."
        body="Add your deployment URL and run Convex to load direct messages."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveMessagesPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveMessagesPageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter()
  const channelsData = useQuery(channelsApi.listChannels, { workspaceSlug })
  const directoryData = useQuery(workspaceApi.directory, { workspaceSlug })
  const createDirectMessage = useMutation(channelsApi.createDirectMessage)
  const [search, setSearch] = useState("")
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (channelsData === undefined || directoryData === undefined) {
    return (
      <LiveLoadingState
        title="Loading messages"
        body="Syncing conversations and the campus directory."
      />
    )
  }

  if (channelsData === null || directoryData === null) {
    return (
      <LiveLoadingState
        title="Preparing messages"
        body="This usually resolves in a moment."
      />
    )
  }

  const normalizedSearch = search.trim().toLowerCase()
  const directMessages = channelsData.directMessages.filter((conversation) =>
    matchesSearch([conversation.name, conversation.preview], normalizedSearch)
  )
  const members = directoryData.members.filter(
    (member) =>
      !member.isCurrentUser &&
      matchesSearch([member.name, member.email, member.role], normalizedSearch)
  )
  const unreadCount = channelsData.directMessages.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  )
  const activeMemberCount = directoryData.members.filter(
    (member) => !member.isCurrentUser && member.isActive
  ).length
  const threadCount = channelsData.directMessages.length
  const threadSummary = unreadCount
    ? `${unreadCount} unread in ${threadCount} ${threadCount === 1 ? "thread" : "threads"}`
    : `${threadCount} ${threadCount === 1 ? "thread" : "threads"}`

  const startConversation = (userId: string) => {
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="do-eyebrow">Messages</p>
              <h1 className="text-[28px] font-semibold tracking-tight text-cream">Inbox</h1>
              <p className="text-[13px] leading-6 text-tan">{threadSummary}</p>
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

        {directMessages.length ? (
          <div className="divide-y divide-hairline">
            {directMessages.map((conversation) => (
              <Link
                key={conversation.id}
                href={workspaceMessagePath(workspaceSlug, conversation.slug)}
                className="block px-5 py-4 transition-colors hover:bg-active-row/70 sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream">
                    {conversation.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-medium text-cream">
                        {conversation.name}
                      </p>
                      {conversation.unreadCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[rgba(201,132,122,0.18)] px-1.5 py-0.5 text-[11px] font-medium text-parchment">
                          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[13px] leading-6 text-tan">
                      {conversation.preview || "No messages yet"}
                    </p>
                  </div>

                  <span className="shrink-0 text-[11px] text-tan">
                    {formatRelativeActivity(conversation.lastMessageAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
            No conversations match this search.
          </div>
        )}
      </section>

      <aside className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <p className="do-eyebrow">People</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-medium text-cream">New message</h2>
            <span className="text-[12px] text-tan">{activeMemberCount} active</span>
          </div>
        </div>

        {members.length ? (
          <div className="divide-y divide-hairline">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-5 py-4 sm:px-6"
              >
                <Link
                  href={workspacePersonPath(workspaceSlug, member.id)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-cream">
                        {member.name}
                      </span>
                      <PresenceDot
                        status={member.isActive ? "online" : "offline"}
                        className="size-2.5"
                      />
                    </span>
                    <span className="mt-1 block truncate text-[12px] leading-5 text-tan">
                      {member.isActive
                        ? "Active now"
                        : member.role === "admin"
                          ? "Admin"
                          : "Member"}
                    </span>
                  </span>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending && pendingUserId === member.id}
                  onClick={() => startConversation(member.id)}
                >
                  Message
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
            No people match this search.
          </div>
        )}
      </aside>
    </div>
  )
}
