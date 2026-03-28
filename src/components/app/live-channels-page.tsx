"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  LockKeyholeIcon,
  PlusIcon,
  ShieldCheckIcon,
  Users2Icon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { PresenceDot } from "@/components/app/presence-dot"
import { LiveLoadingState } from "@/components/app/live-loading-state"
import { MemberProfileSheet } from "@/components/app/member-profile-sheet"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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

function membershipLabel(
  membershipState:
    | "public"
    | "admin"
    | "owner"
    | "officer"
    | "member"
    | "pending"
    | "notMember"
) {
  if (membershipState === "public") return "Campus-wide"
  if (membershipState === "admin") return "Admin access"
  if (membershipState === "owner") return "Club owner"
  if (membershipState === "officer") return "Officer"
  if (membershipState === "member") return "Joined"
  if (membershipState === "pending") return "Request pending"
  return "Request required"
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
  const requestToJoin = useMutation(convexApi.chat.requestToJoin)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [pendingJoinSlug, setPendingJoinSlug] = useState<string | null>(null)
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
  const channels = channelsData.channels.map((channel) => {
    const access = channel.access ?? (channel.slug === "general" ? "public" : "members")
    const membershipState =
      channel.membershipState ??
      (access === "public" ? "public" : isAdmin ? "admin" : "notMember")

    return {
      ...channel,
      access,
      memberCount:
        channel.memberCount ?? (access === "public" ? directoryData.members.length : 0),
      membershipState,
      canOpen:
        channel.canOpen ??
        (access === "public" ||
          membershipState === "admin" ||
          membershipState === "member"),
      canRequestToJoin:
        channel.canRequestToJoin ??
        (access === "members" &&
          membershipState !== "admin" &&
          membershipState !== "member" &&
          membershipState !== "pending"),
    }
  })

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

  const handleRequestToJoin = (slug: string) => {
    setPendingJoinSlug(slug)

    startTransition(async () => {
      try {
        await requestToJoin({ workspaceSlug, slug })
        toast.success("Join request sent")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to request access."
        )
      } finally {
        setPendingJoinSlug(null)
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
                Campus Feed stays open to everyone, while club spaces now support
                real membership and join requests instead of one giant campus chat.
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
                  Institute admins create club spaces. Students can browse clubs,
                  request membership, and join once approved.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {channels.length ? (
            channels.map((channel) => (
              <div key={channel.id} className="do-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[18px] font-medium text-cream">{channel.name}</p>
                      {channel.access === "members" ? (
                        <span className="do-pill">
                          <LockKeyholeIcon className="size-3.5" />
                          Members
                        </span>
                      ) : (
                        <span className="do-pill">Campus-wide</span>
                      )}
                      <span className="do-pill">{membershipLabel(channel.membershipState)}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-tan">
                      {channel.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="do-pill">{channel.memberCount} members</span>
                    <span className="do-pill">{channel.messageCount} messages</span>
                    <span className="do-pill">{formatActivity(channel.lastMessageAt)}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[12px] text-parchment">
                    <span className="text-tan/80">#</span> {channel.slug}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      View club
                    </Link>
                    {channel.canOpen ? (
                      <Link
                        href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        Open chat
                        <ArrowRightIcon className="size-4" />
                      </Link>
                    ) : channel.canRequestToJoin ? (
                      <Button
                        size="sm"
                        disabled={isPending && pendingJoinSlug === channel.slug}
                        onClick={() => handleRequestToJoin(channel.slug)}
                      >
                        Request to join
                      </Button>
                    ) : (
                      <span className="do-pill">Waiting for approval</span>
                    )}
                  </div>
                </div>
              </div>
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
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Click a member to open their full campus profile.
              </p>
            </div>
            <span className="do-pill">
              <Users2Icon className="size-3.5" />
              {directoryData.members.length}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {directoryData.members.length ? (
              directoryData.members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="do-card w-full p-4 text-left"
                  onClick={() => setSelectedMemberId(member.id)}
                >
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
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                Students appear here after they sign into the campus.
              </div>
            )}
          </div>
        </section>
      </aside>

      <MemberProfileSheet
        workspaceSlug={workspaceSlug}
        userId={selectedMemberId}
        open={selectedMemberId !== null}
        onClose={() => setSelectedMemberId(null)}
      />
    </div>
  )
}
