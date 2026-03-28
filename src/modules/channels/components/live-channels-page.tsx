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

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"
import { channelsApi } from "@/modules/channels/api"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { MemberProfileSheet } from "@/modules/workspace/components/member-profile-sheet"
import { workspaceApi } from "@/modules/workspace/api"

const clubCategories = [
  "Academic",
  "Technology",
  "Cultural",
  "Sports",
  "Media",
  "Student Government",
  "Community Service",
  "General Club",
] as const
const accessOptions = [
  { id: "public", label: "Open club" },
  { id: "members", label: "Approval required" },
] as const
const selectClassName =
  "h-10 rounded-2xl border border-hairline bg-field/90 px-3 text-[13px] text-parchment outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"

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
        title="Clubs need Convex."
        body="Add your deployment URL and run Convex to load club data."
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
  const channelsData = useQuery(channelsApi.listChannels, { workspaceSlug })
  const directoryData = useQuery(workspaceApi.directory, { workspaceSlug })
  const createChannel = useMutation(channelsApi.createChannel)
  const joinOpenClub = useMutation(channelsApi.joinOpenClub)
  const requestToJoin = useMutation(channelsApi.requestToJoin)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<(typeof clubCategories)[number]>("General Club")
  const [access, setAccess] = useState<"public" | "members">("members")
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [pendingJoinSlug, setPendingJoinSlug] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (channelsData === undefined || directoryData === undefined) {
    return (
      <LiveLoadingState
        title="Loading clubs"
        body="Syncing club data."
      />
    )
  }

  if (channelsData === null || directoryData === null) {
    return (
      <LiveLoadingState
        title="Preparing workspace"
        body="This usually resolves in a moment."
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
      category: channel.category,
      memberCount:
        channel.memberCount ?? (access === "public" ? directoryData.members.length : 0),
      membershipState,
      canOpen:
        channel.canOpen ??
        (access === "public" ||
          membershipState === "admin" ||
          membershipState === "member"),
      canJoin:
        channel.canJoin ??
        (channel.slug !== "general" &&
          access === "public" &&
          membershipState === "public"),
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
          category,
          access,
        })

        setName("")
        setDescription("")
        setCategory("General Club")
        setAccess("members")
        toast.success("Club space created")
        router.push(workspacePath(workspaceSlug, `/channels/${result.slug}`))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create club space."
        )
      }
    })
  }

  const handleJoinOpenClub = (slug: string) => {
    setPendingJoinSlug(slug)

    startTransition(async () => {
      try {
        await joinOpenClub({ workspaceSlug, slug })
        toast.success("Club joined")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to join club.")
      } finally {
        setPendingJoinSlug(null)
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
        <div className="do-surface p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="do-eyebrow">Clubs</p>
              <h2 className="mt-2 do-subheading">Browse, join, or create a club.</h2>
            </div>

            <div className="do-panel p-5">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-tan uppercase">
                <ShieldCheckIcon className="size-4 text-sage" />
                {isAdmin ? "College admin controls" : "Student view"}
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
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as (typeof clubCategories)[number])
                  }
                  className={selectClassName}
                  disabled={!isAdmin || isPending}
                >
                  {clubCategories.map((clubCategory) => (
                    <option key={clubCategory} value={clubCategory}>
                      {clubCategory}
                    </option>
                  ))}
                </select>
                <select
                  value={access}
                  onChange={(event) =>
                    setAccess(event.target.value as "public" | "members")
                  }
                  className={selectClassName}
                  disabled={!isAdmin || isPending}
                >
                  {accessOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={!isAdmin || isPending || !name.trim()}>
                  <PlusIcon className="size-4" />
                  Create club space
                </Button>
              </form>
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
                      <span className="do-pill">{channel.category}</span>
                      {channel.access === "members" ? (
                        <span className="do-pill">
                          <LockKeyholeIcon className="size-3.5" />
                          Approval
                        </span>
                      ) : (
                        <span className="do-pill">Open</span>
                      )}
                      <span className="do-pill">{membershipLabel(channel.membershipState)}</span>
                    </div>
                    <p className="mt-2 text-[13px] text-tan">
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
                    {channel.canJoin ? (
                      <Button
                        size="sm"
                        disabled={isPending && pendingJoinSlug === channel.slug}
                        onClick={() => handleJoinOpenClub(channel.slug)}
                      >
                        Join club
                      </Button>
                    ) : channel.canOpen ? (
                      <Link
                        href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        Open club
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
            <div className="do-panel p-6 text-[13px] text-tan">
              No clubs yet.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="do-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="do-eyebrow">People</p>
              <h3 className="mt-2 text-[20px] font-medium text-cream">Directory</h3>
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
                        {member.role === "admin" ? "College admin" : "Student member"}
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
              <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] text-tan">
                No members yet.
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
