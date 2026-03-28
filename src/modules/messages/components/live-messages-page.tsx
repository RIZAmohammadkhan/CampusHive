"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { MessageCircleIcon, SearchIcon, UserCircle2Icon } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  workspaceMessagePath,
  workspaceMessagesPath,
  workspacePersonPath,
} from "@/lib/workspaces"
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
    <div className="space-y-6">
      <section className="do-surface overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-6">
            <div>
              <p className="do-eyebrow">Messages</p>
              <h2 className="mt-2 do-subheading">Direct messages that feel intentional.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-tan">
                Open dedicated threads, jump into member profiles, and keep one-to-one
                conversations separate from club activity.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="do-card p-5">
                <p className="do-stat-label">Open threads</p>
                <p className="mt-4 do-stat-value">{channelsData.directMessages.length}</p>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  One thread per person, not one generic inbox.
                </p>
              </div>
              <div className="do-card p-5">
                <p className="do-stat-label">Unread</p>
                <p className="mt-4 do-stat-value">{unreadCount}</p>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Conversations waiting on your response.
                </p>
              </div>
              <div className="do-card p-5">
                <p className="do-stat-label">Active people</p>
                <p className="mt-4 do-stat-value">{activeMemberCount}</p>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Members currently active in the workspace.
                </p>
              </div>
            </div>

            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-tan" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search messages or people"
                className="pl-10"
              />
            </div>
          </div>

          <div className="do-card p-5">
            <p className="do-eyebrow">Workflow</p>
            <h3 className="mt-3 text-[20px] font-medium text-cream">
              Productive private conversations
            </h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                Every DM now opens in its own thread page instead of sharing a club-style
                layout.
              </div>
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                Member profiles live on their own pages, so you can inspect club memberships
                before reaching out.
              </div>
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                Start from the directory on the right, then stay focused inside the thread.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="do-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="do-eyebrow">Inbox</p>
              <h3 className="mt-2 text-[24px] font-medium text-cream">Recent threads</h3>
            </div>
            <span className="do-pill">{directMessages.length}</span>
          </div>

          <div className="mt-5 space-y-3">
            {directMessages.length ? (
              directMessages.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={workspaceMessagePath(workspaceSlug, conversation.slug)}
                  className="do-card block p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[14px] font-medium text-cream">
                      {conversation.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[16px] font-medium text-cream">
                              {conversation.name}
                            </p>
                            {conversation.unreadCount > 0 ? (
                              <span className="do-pill do-pill-rose">
                                {conversation.unreadCount > 9
                                  ? "9+ unread"
                                  : `${conversation.unreadCount} unread`}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-tan">
                            {conversation.preview}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] tracking-[0.12em] text-tan uppercase">
                          {formatRelativeActivity(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-6 text-[13px] leading-6 text-tan">
                No conversations match this search yet. Start a new thread from the people
                panel.
              </div>
            )}
          </div>
        </section>

        <aside className="do-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="do-eyebrow">People</p>
              <h3 className="mt-2 text-[22px] font-medium text-cream">Start a thread</h3>
            </div>
            <Link
              href={workspaceMessagesPath(workspaceSlug)}
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-tan transition-colors hover:text-parchment"
            >
              Refresh view
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {members.length ? (
              members.map((member) => (
                <div key={member.id} className="do-card p-4">
                  <div className="flex items-start gap-3">
                    <Link
                      href={workspacePersonPath(workspaceSlug, member.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream">
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
                        <span className="mt-1 block text-[12px] leading-6 text-tan">
                          {member.role === "admin" ? "College admin" : "Student member"}
                        </span>
                        <span className="block truncate text-[12px] leading-6 text-tan">
                          {member.email ?? "No email synced"}
                        </span>
                      </span>
                    </Link>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        disabled={isPending && pendingUserId === member.id}
                        onClick={() => startConversation(member.id)}
                      >
                        <MessageCircleIcon className="size-4" />
                        Message
                      </Button>
                      <Link
                        href={workspacePersonPath(workspaceSlug, member.id)}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                          "justify-center"
                        )}
                      >
                        <UserCircle2Icon className="size-4" />
                        Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-5 text-[13px] leading-6 text-tan">
                No people match this search.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
