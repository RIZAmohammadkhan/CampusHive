"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowRightIcon, PlusIcon, ShieldCheckIcon, Users2Icon } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { PresenceDot } from "@/components/app/presence-dot"
import { LiveLoadingState } from "@/components/app/live-loading-state"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { convexApi } from "@/lib/convex-api"
import { workspacePath } from "@/lib/workspaces"

function formatActivity(timestamp: number | null) {
  if (!timestamp) {
    return "No messages yet"
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  return `${Math.round(diffMinutes / 60)} hr ago`
}

export function LiveChannelsPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Club spaces need a live Convex deployment."
        body="Community history, campus membership, and message persistence run through Convex. Configure the deployment URL to turn this route into a functional campus communication layer."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveChannelsPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveChannelsPageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter()
  const channelsData = useQuery(convexApi.chat.listChannels, { workspaceSlug })
  const directoryData = useQuery(convexApi.workspaces.directory, { workspaceSlug })
  const createChannel = useMutation(convexApi.chat.createChannel)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  if (channelsData === undefined || directoryData === undefined) {
    return (
      <LiveLoadingState
        title="Loading club spaces"
        body="Convex is syncing community metadata, campus roles, and live student presence."
      />
    )
  }

  if (channelsData === null || directoryData === null) {
    return (
      <LiveLoadingState
        title="Preparing campus spaces"
        body="The campus record is still being created. This usually resolves in a moment."
      />
    )
  }

  const isAdmin = channelsData.currentRole === "admin"

  const handleCreateChannel = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        const result = await createChannel({
          workspaceSlug,
          name,
          description: description || undefined,
        })

        setName("")
        setDescription("")
        toast.success("Club space created")
        router.push(workspacePath(workspaceSlug, `/channels/${result.slug}`))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create club space."
        )
      }
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="space-y-6">
        <div className="do-surface p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <p className="do-eyebrow">Club Discovery & Joining</p>
              <h2 className="do-heading max-w-3xl">
                Every community on campus needs a place students can actually find.
              </h2>
              <p className="max-w-2xl do-copy">
                Institute admins can create club spaces here. Everyone else gets a
                clean directory of live communities instead of half-buried group chats.
              </p>
            </div>

            <div className="do-panel p-5">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-tan uppercase">
                <ShieldCheckIcon className="size-4 text-sage" />
                {isAdmin ? "Institute admin controls" : "Student view"}
              </div>
              <form onSubmit={handleCreateChannel} className="mt-4 space-y-3">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Club space name"
                  disabled={!isAdmin || isPending}
                />
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this community for?"
                  disabled={!isAdmin || isPending}
                />
                <Button type="submit" disabled={!isAdmin || isPending || !name.trim()}>
                  <PlusIcon className="size-4" />
                  Create club space
                </Button>
              </form>
              {!isAdmin ? (
                <p className="mt-3 text-[12px] leading-6 text-tan">
                  Only institute admins can create club spaces or change campus
                  structure.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {channelsData.channels.length ? (
            channelsData.channels.map((channel) => (
              <Link
                key={channel.id}
                href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                className="do-card block p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[18px] font-medium text-cream">{channel.name}</p>
                    <p className="mt-2 text-[13px] leading-6 text-tan">
                      {channel.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="do-pill">{channel.messageCount} messages</span>
                    <span className="do-pill">{formatActivity(channel.lastMessageAt)}</span>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-[12px] text-parchment">
                  Open #{channel.slug}
                  <ArrowRightIcon className="size-4" />
                </div>
              </Link>
            ))
          ) : (
            <div className="do-panel p-6 text-[13px] leading-6 text-tan">
              No club spaces exist yet. Create the first one to start a visible,
              searchable community layer for this campus.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="do-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="do-eyebrow">Campus Members</p>
              <h3 className="mt-2 text-[20px] font-medium text-cream">
                Student directory
              </h3>
            </div>
            <span className="do-pill">
              <Users2Icon className="size-3.5" />
              {directoryData.members.length}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {directoryData.members.length ? (
              directoryData.members.map((member) => (
                <div key={member.id} className="do-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                      {member.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-cream">
                        {member.name}
                      </span>
                      <span className="block text-[12px] leading-6 text-tan">
                        {member.role === "admin" ? "Institute admin" : "Student member"}
                        {member.isCurrentUser ? " · You" : ""}
                      </span>
                    </span>
                    <PresenceDot
                      status={member.isActive ? "online" : "offline"}
                      className="size-2.5"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                Students appear here after they sign into the campus.
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  )
}
