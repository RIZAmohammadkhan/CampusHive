"use client"

import { type FormEvent, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
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
import {
  workspaceClubDiscussionPath,
  workspaceClubPath,
} from "@/lib/workspaces"
import { channelsApi, type ChannelListData } from "@/modules/channels/api"
import { defaultDiscussionSlug } from "@/modules/channels/components/conversation-utils"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

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
  "h-10 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 text-[13px] text-parchment outline-none transition-[border-color,box-shadow] focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"

function formatActivity(timestamp: number | null) {
  if (!timestamp) {
    return "Quiet right now"
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  if (diffMinutes < 1_440) {
    return `${Math.round(diffMinutes / 60)} hr ago`
  }

  return `${Math.round(diffMinutes / 1_440)} day ago`
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
  if (membershipState === "public") return "Open access"
  if (membershipState === "admin") return "Admin access"
  if (membershipState === "owner") return "Owner"
  if (membershipState === "officer") return "Officer"
  if (membershipState === "member") return "Joined"
  if (membershipState === "pending") return "Pending"
  return "Private"
}

function clubRoleLabel(role: "owner" | "officer" | "member") {
  if (role === "owner") return "Owner"
  if (role === "officer") return "Officer"
  return "Member"
}

function matchesClubSearch(
  club: ChannelListData["channels"][number],
  searchTerm: string
) {
  if (!searchTerm) {
    return true
  }

  return [club.name, club.slug, club.category, club.description]
    .join(" ")
    .toLowerCase()
    .includes(searchTerm)
}

function clubInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  return parts.length
    ? parts.map((part) => part.charAt(0).toUpperCase()).join("")
    : "CL"
}

type ClubDirectoryCardProps = {
  club: ChannelListData["channels"][number]
  workspaceSlug: string
  isPending: boolean
  pendingJoinSlug: string | null
  onJoinOpenClub: (slug: string) => void
  onRequestToJoin: (slug: string) => void
}

function ClubDirectoryCard({
  club,
  workspaceSlug,
  isPending,
  pendingJoinSlug,
  onJoinOpenClub,
  onRequestToJoin,
}: ClubDirectoryCardProps) {
  return (
    <article className="do-card p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-[18px] border border-hairline bg-panel/85 text-[16px] font-semibold tracking-[0.12em] text-cream">
              {clubInitials(club.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-medium text-cream">{club.name}</h3>
                <span className="do-pill">{club.category}</span>
                <span className="do-pill">
                  {club.access === "members" ? (
                    <>
                      <LockKeyholeIcon className="size-3.5" />
                      Approval
                    </>
                  ) : (
                    "Open"
                  )}
                </span>
                <span className="do-pill">{membershipLabel(club.membershipState)}</span>
                {club.viewerClubRole ? (
                  <span className="do-pill">{clubRoleLabel(club.viewerClubRole)}</span>
                ) : null}
              </div>
              <p className="mt-2 text-[13px] leading-6 text-tan">{club.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="do-pill">
                  <UsersIcon className="size-3.5" />
                  {club.memberCount} members
                </span>
                <span className="do-pill">
                  <MessageSquareTextIcon className="size-3.5" />
                  {club.messageCount} messages
                </span>
                <span className="do-pill">{formatActivity(club.lastMessageAt)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3 text-right">
            <p className="text-[10px] tracking-[0.16em] text-tan uppercase">Club ID</p>
            <p className="mt-2 text-[14px] font-medium text-cream">#{club.slug}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={workspaceClubPath(workspaceSlug, club.slug)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Club profile
          </Link>
          {club.canJoin ? (
            <Button
              size="sm"
              disabled={isPending && pendingJoinSlug === club.slug}
              onClick={() => onJoinOpenClub(club.slug)}
            >
              Join club
            </Button>
          ) : club.canOpen ? (
            <Link
              href={workspaceClubDiscussionPath(
                workspaceSlug,
                club.slug,
                defaultDiscussionSlug(club.isGeneral)
              )}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Open discussion
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : club.canRequestToJoin ? (
            <Button
              size="sm"
              disabled={isPending && pendingJoinSlug === club.slug}
              onClick={() => onRequestToJoin(club.slug)}
            >
              Request to join
            </Button>
          ) : (
            <span className="do-pill">Waiting for approval</span>
          )}
        </div>
      </div>
    </article>
  )
}

type ClubSectionProps = {
  title: string
  eyebrow: string
  description: string
  emptyMessage: string
  clubs: ChannelListData["channels"]
  workspaceSlug: string
  isPending: boolean
  pendingJoinSlug: string | null
  onJoinOpenClub: (slug: string) => void
  onRequestToJoin: (slug: string) => void
}

function ClubSection({
  title,
  eyebrow,
  description,
  emptyMessage,
  clubs,
  workspaceSlug,
  isPending,
  pendingJoinSlug,
  onJoinOpenClub,
  onRequestToJoin,
}: ClubSectionProps) {
  return (
    <section className="do-panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="do-eyebrow">{eyebrow}</p>
          <h3 className="mt-2 text-[22px] font-medium text-cream">{title}</h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-tan">{description}</p>
        </div>
        <span className="do-pill">{clubs.length}</span>
      </div>

      <div className="mt-5 space-y-4">
        {clubs.length ? (
          clubs.map((club) => (
            <ClubDirectoryCard
              key={club.id}
              club={club}
              workspaceSlug={workspaceSlug}
              isPending={isPending}
              pendingJoinSlug={pendingJoinSlug}
              onJoinOpenClub={onJoinOpenClub}
              onRequestToJoin={onRequestToJoin}
            />
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-hairline bg-surface/50 p-5 text-[13px] leading-6 text-tan">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  )
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
  const createChannel = useMutation(channelsApi.createChannel)
  const joinOpenClub = useMutation(channelsApi.joinOpenClub)
  const requestToJoin = useMutation(channelsApi.requestToJoin)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<(typeof clubCategories)[number]>("General Club")
  const [access, setAccess] = useState<"public" | "members">("members")
  const [search, setSearch] = useState("")
  const [pendingJoinSlug, setPendingJoinSlug] = useState<string | null>(null)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!showCreatePanel) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCreatePanel(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [showCreatePanel])

  if (channelsData === undefined) {
    return (
      <LiveLoadingState
        title="Loading clubs"
        body="Syncing club spaces and memberships."
      />
    )
  }

  if (channelsData === null) {
    return (
      <LiveLoadingState
        title="Preparing workspace"
        body="This usually resolves in a moment."
      />
    )
  }

  const isAdmin = channelsData.currentRole === "admin"
  const campusFeed = channelsData.channels.find((channel) => channel.isGeneral) ?? null
  const clubs = channelsData.channels.filter((channel) => !channel.isGeneral)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredClubs = clubs.filter((club) => matchesClubSearch(club, normalizedSearch))
  const joinedClubs = filteredClubs.filter((club) => club.viewerClubRole !== null)
  const pendingClubs = filteredClubs.filter(
    (club) => club.viewerClubRole === null && club.membershipState === "pending"
  )
  const discoverClubs = filteredClubs.filter(
    (club) => club.viewerClubRole === null && club.membershipState !== "pending"
  )
  const joinedClubCount = clubs.filter((club) => club.viewerClubRole !== null).length
  const pendingClubCount = clubs.filter(
    (club) => club.viewerClubRole === null && club.membershipState === "pending"
  ).length
  const openClubCount = clubs.filter((club) => club.access === "public").length

  const handleCreateChannel = (event: FormEvent<HTMLFormElement>) => {
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
        setShowCreatePanel(false)
        toast.success("Club space created")
        router.push(workspaceClubPath(workspaceSlug, result.slug))
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
    <div className="space-y-6">
      <section className="do-surface overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p className="do-eyebrow">Clubs</p>
              <h2 className="mt-2 do-subheading">Browse and join clubs.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-tan">
                Find active clubs, open club pages, and manage memberships in one place.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="do-card p-5">
                <p className="do-stat-label">Joined clubs</p>
                <p className="mt-4 do-stat-value">{joinedClubCount}</p>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Clubs where you already have access.
                </p>
              </div>
              <div className="do-card p-5">
                <p className="do-stat-label">Open clubs</p>
                <p className="mt-4 do-stat-value">{openClubCount}</p>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Spaces you can join immediately.
                </p>
              </div>
              <div className="do-card p-5">
                <p className="do-stat-label">Pending approvals</p>
                <p className="mt-4 do-stat-value">{pendingClubCount}</p>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Requests that still need review.
                </p>
              </div>
            </div>

            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-tan" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clubs"
                className="pl-10"
              />
            </div>
          </div>

          <div className="do-card p-5">
            <p className="do-eyebrow">{campusFeed ? "Campus feed" : "Clubs"}</p>
            {campusFeed ? (
              <>
                <h3 className="mt-3 text-[20px] font-medium text-cream">
                  {campusFeed.name}
                </h3>
                <p className="mt-3 text-[13px] leading-6 text-tan">
                  Shared updates for everyone.
                </p>
              </>
            ) : (
              <p className="mt-3 text-[13px] leading-6 text-tan">
                Club directory.
              </p>
            )}

            <div className="mt-5 space-y-2">
              {campusFeed ? (
                <Link
                  href={workspaceClubDiscussionPath(
                    workspaceSlug,
                    campusFeed.slug,
                    defaultDiscussionSlug(campusFeed.isGeneral)
                  )}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  Open feed
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : null}
              {isAdmin ? (
                <Button className="w-full" onClick={() => setShowCreatePanel(true)}>
                  <PlusIcon className="size-4" />
                  Add club
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <ClubSection
        title="Your active clubs"
        eyebrow="Joined"
        description="Clubs you joined."
        emptyMessage={
          normalizedSearch
            ? "No joined clubs match this search."
            : isAdmin
              ? "Create or join a club and it will appear here."
              : "Join a club and it will appear here."
        }
        clubs={joinedClubs}
        workspaceSlug={workspaceSlug}
        isPending={isPending}
        pendingJoinSlug={pendingJoinSlug}
        onJoinOpenClub={handleJoinOpenClub}
        onRequestToJoin={handleRequestToJoin}
      />

      <ClubSection
        title="Pending approvals"
        eyebrow="Queue"
        description="Requests waiting for approval."
        emptyMessage={
          normalizedSearch
            ? "No pending clubs match this search."
            : "You do not have any pending club requests right now."
        }
        clubs={pendingClubs}
        workspaceSlug={workspaceSlug}
        isPending={isPending}
        pendingJoinSlug={pendingJoinSlug}
        onJoinOpenClub={handleJoinOpenClub}
        onRequestToJoin={handleRequestToJoin}
      />

      <ClubSection
        title="Discover more clubs"
        eyebrow="Directory"
        description="All available clubs."
        emptyMessage={
          normalizedSearch
            ? "No clubs match this search."
            : "No additional clubs are available right now."
        }
        clubs={discoverClubs}
        workspaceSlug={workspaceSlug}
        isPending={isPending}
        pendingJoinSlug={pendingJoinSlug}
        onJoinOpenClub={handleJoinOpenClub}
        onRequestToJoin={handleRequestToJoin}
      />

      {isAdmin && showCreatePanel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm md:p-6"
          onClick={() => setShowCreatePanel(false)}
        >
          <div
            className="do-surface w-full max-w-2xl p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="do-eyebrow">Create club</p>
                <h3 className="mt-2 text-[24px] font-medium text-cream">New club</h3>
                <p className="mt-2 text-[13px] leading-6 text-tan">
                  The creator becomes the owner.
                </p>
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setShowCreatePanel(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateChannel} className="mt-6 grid gap-3 md:grid-cols-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Club name"
                disabled={isPending}
              />
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as (typeof clubCategories)[number])
                }
                className={selectClassName}
                disabled={isPending}
              >
                {clubCategories.map((clubCategory) => (
                  <option key={clubCategory} value={clubCategory}>
                    {clubCategory}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2">
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short description"
                  disabled={isPending}
                />
              </div>
              <select
                value={access}
                onChange={(event) => setAccess(event.target.value as "public" | "members")}
                className={selectClassName}
                disabled={isPending}
              >
                {accessOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreatePanel(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !name.trim()}>
                  <PlusIcon className="size-4" />
                  Create club
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
