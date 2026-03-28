"use client"

import {
  type FormEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react"
import Link from "next/link"
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClipboardListIcon,
  Clock3Icon,
  HashIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserMinusIcon,
  VoteIcon,
  XIcon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
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
  workspaceClubsPath,
  workspacePersonPath,
} from "@/lib/workspaces"
import { channelsApi, type MessageData } from "@/modules/channels/api"
import {
  clubRoleLabel,
  defaultDiscussionSlug,
  formatEventDate,
  formatRelativeActivity,
  formatShortDate,
  membershipLabel,
} from "@/modules/channels/components/conversation-utils"
import { MinimalChatThread } from "@/modules/channels/components/minimal-chat-thread"
import { TicketQr } from "@/modules/channels/components/ticket-qr"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

const selectClassName =
  "h-10 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 text-[13px] text-parchment outline-none transition-[border-color,box-shadow] focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"
const textareaClassName =
  "min-h-28 w-full rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-tan focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"

type ActionRunner = (
  key: string,
  action: () => Promise<unknown>,
  successMessage: string,
  onSuccess?: () => void
) => void

type ActionButtonProps = {
  label: string
  icon?: ReactNode
  disabled?: boolean
  onClick: () => void
  variant?: "default" | "outline"
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
  variant = "default",
}: ActionButtonProps) {
  return (
    <Button variant={variant} disabled={disabled} onClick={onClick}>
      {icon}
      {label}
    </Button>
  )
}

function ClubViewTabs({
  overviewHref,
  discussionHref,
  overviewActive,
}: {
  overviewHref: string
  discussionHref: string
  overviewActive: boolean
}) {
  return (
    <div className="inline-flex rounded-full border border-hairline bg-surface/55 p-1">
      <Link
        href={overviewHref}
        className={cn(
          "rounded-full px-4 py-2 text-[12px] font-medium tracking-[0.03em] transition-colors",
          overviewActive
            ? "bg-active-row text-parchment"
            : "text-tan hover:text-parchment"
        )}
      >
        Overview
      </Link>
      <Link
        href={discussionHref}
        className={cn(
          "rounded-full px-4 py-2 text-[12px] font-medium tracking-[0.03em] transition-colors",
          !overviewActive
            ? "bg-active-row text-parchment"
            : "text-tan hover:text-parchment"
        )}
      >
        Discussion
      </Link>
    </div>
  )
}

function ClubHero({
  clubSlug,
  name,
  description,
  category,
  accessLabel,
  overviewActive,
  discussionHref,
  overviewHref,
  activityLabel,
  membershipSummary,
  memberCount,
  eventCount,
  pollCount,
}: {
  clubSlug: string
  name: string
  description: string
  category: string
  accessLabel: string
  overviewActive: boolean
  discussionHref: string
  overviewHref: string
  activityLabel: string
  membershipSummary: string
  memberCount: number | null
  eventCount: number
  pollCount: number
}) {
  return (
    <section className="do-surface overflow-hidden">
      <div className="border-b border-hairline px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="do-pill">Club workspace</span>
              <span className="do-pill">
                <MessageSquareTextIcon className="size-3.5" />
                #{clubSlug}
              </span>
              <span className="do-pill">{category}</span>
            </div>
            <h1 className="mt-4 text-[30px] font-semibold tracking-tight text-cream">
              {name}
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-7 text-tan">{description}</p>
          </div>

          <ClubViewTabs
            overviewHref={overviewHref}
            discussionHref={discussionHref}
            overviewActive={overviewActive}
          />
        </div>
      </div>

      <div className="grid gap-3 px-6 py-6 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
          <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Access</p>
          <p className="mt-2 text-[14px] font-medium text-cream">{accessLabel}</p>
        </div>
        <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
          <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Membership</p>
          <p className="mt-2 text-[14px] font-medium text-cream">{membershipSummary}</p>
        </div>
        <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
          <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Members</p>
          <p className="mt-2 text-[14px] font-medium text-cream">
            {memberCount !== null ? memberCount : "Campus-wide"}
          </p>
        </div>
        <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
          <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Events</p>
          <p className="mt-2 text-[14px] font-medium text-cream">{eventCount}</p>
        </div>
        <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
          <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Activity</p>
          <p className="mt-2 text-[14px] font-medium text-cream">{activityLabel}</p>
          <p className="mt-1 text-[11px] text-tan">{pollCount} active decision spaces</p>
        </div>
      </div>
    </section>
  )
}

function MembershipPanel({
  access,
  canJoin,
  canRequestToJoin,
  canLeave,
  canManage,
  canEditRoles,
  viewerMembershipState,
  isPending,
  pendingAction,
  onJoin,
  onRequest,
  onLeave,
}: {
  access: "public" | "members"
  canJoin: boolean
  canRequestToJoin: boolean
  canLeave: boolean
  canManage: boolean
  canEditRoles: boolean
  viewerMembershipState:
    | "public"
    | "admin"
    | "owner"
    | "officer"
    | "member"
    | "pending"
    | "notMember"
  isPending: boolean
  pendingAction: string | null
  onJoin: () => void
  onRequest: () => void
  onLeave: () => void
}) {
  return (
    <section className="do-panel p-5">
      <p className="do-eyebrow">Membership</p>
      <h3 className="mt-2 text-[20px] font-medium text-cream">
        {access === "public" ? "Open access" : "Membership"}
      </h3>
      <div className="mt-5 space-y-3 text-[13px] text-tan">
        <div className="rounded-2xl border border-hairline bg-surface/55 p-4">
          {access === "public"
            ? "Anyone in the workspace can join."
            : "Approval is required to join."}
        </div>
        {canManage ? (
          <div className="rounded-2xl border border-hairline bg-surface/55 p-4">
            <span className="inline-flex items-center gap-2 text-parchment">
              <ShieldCheckIcon className="size-4 text-sage" />
              {access === "members"
                ? canEditRoles
                  ? "You can review requests and manage roles."
                  : "You can review requests and manage activity."
                : "You can manage this club here."}
            </span>
          </div>
        ) : null}
        {canJoin ? (
          <ActionButton
            label="Join club"
            disabled={isPending && pendingAction === "join-open-club"}
            onClick={onJoin}
          />
        ) : canRequestToJoin ? (
          <ActionButton
            label="Request to join"
            disabled={isPending && pendingAction === "request-to-join"}
            onClick={onRequest}
          />
        ) : null}
        {canLeave ? (
          <ActionButton
            label="Leave club"
            variant="outline"
            disabled={isPending && pendingAction === "leave-channel"}
            onClick={onLeave}
          />
        ) : null}
        {viewerMembershipState === "pending" ? (
          <span className="do-pill">Join request pending</span>
        ) : null}
      </div>
    </section>
  )
}

function MembersPanel({
  workspaceSlug,
  members,
  filteredMembers,
  memberSearch,
  setMemberSearch,
  canManage,
  access,
  canEditRoles,
  isPending,
  pendingAction,
  runAction,
  clubSlug,
  removeMember,
  setMemberRole,
}: {
  workspaceSlug: string
  members: Array<{
    id: string
    name: string
    imageUrl: string | null
    role: "owner" | "officer" | "member"
    joinedAt: number
    isCurrentUser: boolean
  }>
  filteredMembers: Array<{
    id: string
    name: string
    imageUrl: string | null
    role: "owner" | "officer" | "member"
    joinedAt: number
    isCurrentUser: boolean
  }>
  memberSearch: string
  setMemberSearch: (value: string) => void
  canManage: boolean
  access: "public" | "members"
  canEditRoles: boolean
  isPending: boolean
  pendingAction: string | null
  runAction: ActionRunner
  clubSlug: string
  removeMember: (args: {
    workspaceSlug: string
    slug: string
    userId: string
  }) => Promise<null>
  setMemberRole: (args: {
    workspaceSlug: string
    slug: string
    userId: string
    role: "owner" | "officer" | "member"
  }) => Promise<null>
}) {
  return (
    <section className="do-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="do-eyebrow">Members</p>
          <h3 className="mt-2 text-[20px] font-medium text-cream">Enrolled roster</h3>
        </div>
        <span className="do-pill">{filteredMembers.length}</span>
      </div>
      <div className="relative mt-5">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tan" />
        <Input
          value={memberSearch}
          onChange={(event) => setMemberSearch(event.target.value)}
          placeholder="Search members by name or role"
          className="pl-9"
        />
      </div>
      <div className="mt-5 space-y-3">
        {filteredMembers.length ? (
          filteredMembers.map((member) => (
            <div key={member.id} className="do-card p-4">
              <div className="flex items-start gap-3">
                <Link
                  href={workspacePersonPath(workspaceSlug, member.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                    {member.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-cream">
                        {member.name}
                      </span>
                      <span className="do-pill">{clubRoleLabel(member.role)}</span>
                      {member.isCurrentUser ? <span className="do-pill">You</span> : null}
                    </span>
                    <span className="mt-1 block text-[12px] leading-6 text-tan">
                      Joined {formatShortDate(member.joinedAt)}
                    </span>
                  </span>
                </Link>
                {canManage && access === "members" ? (
                  <div className="flex min-w-[148px] flex-col gap-2">
                    {canEditRoles ? (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          runAction(
                            `role-${member.id}`,
                            () =>
                              setMemberRole({
                                workspaceSlug,
                                slug: clubSlug,
                                userId: member.id,
                                role: event.target.value as "owner" | "officer" | "member",
                              }),
                            "Club role updated"
                          )
                        }
                        className={`${selectClassName} w-full`}
                        disabled={isPending && pendingAction === `role-${member.id}`}
                      >
                        <option value="owner">Owner</option>
                        <option value="officer">Officer</option>
                        <option value="member">Member</option>
                      </select>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending && pendingAction === `remove-${member.id}`}
                      onClick={() =>
                        runAction(
                          `remove-${member.id}`,
                          () =>
                            removeMember({
                              workspaceSlug,
                              slug: clubSlug,
                              userId: member.id,
                            }),
                          "Member removed"
                        )
                      }
                    >
                      <UserMinusIcon className="size-4" />
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] text-tan">
            {members.length ? "No members match this search." : "No members yet."}
          </div>
        )}
      </div>
    </section>
  )
}

function PendingRequestsPanel({
  workspaceSlug,
  clubSlug,
  pendingRequests,
  isPending,
  pendingAction,
  runAction,
  reviewJoinRequest,
}: {
  workspaceSlug: string
  clubSlug: string
  pendingRequests: Array<{
    userId: string
    name: string
    imageUrl: string | null
    createdAt: number
  }>
  isPending: boolean
  pendingAction: string | null
  runAction: ActionRunner
  reviewJoinRequest: (args: {
    workspaceSlug: string
    slug: string
    userId: string
    approve: boolean
  }) => Promise<null>
}) {
  if (!pendingRequests.length) {
    return null
  }

  return (
    <section className="do-panel p-5">
      <p className="do-eyebrow">Pending Requests</p>
      <h3 className="mt-2 text-[20px] font-medium text-cream">Awaiting approval</h3>
      <div className="mt-5 space-y-3">
        {pendingRequests.map((request) => (
          <div key={request.userId} className="do-card p-4">
            <Link
              href={workspacePersonPath(workspaceSlug, request.userId)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                {request.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-cream">
                  {request.name}
                </span>
                <span className="mt-1 block text-[12px] leading-6 text-tan">
                  Requested {formatShortDate(request.createdAt)}
                </span>
              </span>
            </Link>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={isPending && pendingAction === `approve-${request.userId}`}
                onClick={() =>
                  runAction(
                    `approve-${request.userId}`,
                    () =>
                      reviewJoinRequest({
                        workspaceSlug,
                        slug: clubSlug,
                        userId: request.userId,
                        approve: true,
                      }),
                    "Join request approved"
                  )
                }
              >
                <CheckIcon className="size-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending && pendingAction === `reject-${request.userId}`}
                onClick={() =>
                  runAction(
                    `reject-${request.userId}`,
                    () =>
                      reviewJoinRequest({
                        workspaceSlug,
                        slug: clubSlug,
                        userId: request.userId,
                        approve: false,
                      }),
                    "Join request rejected"
                  )
                }
              >
                <XIcon className="size-4" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LiveClubPage({
  workspaceSlug,
  clubSlug,
  sectionSlug,
}: {
  workspaceSlug: string
  clubSlug: string
  sectionSlug?: string
}) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="This page needs Convex."
        body="Add your deployment URL and run Convex to load messages and club activity."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveClubPageInner
        workspaceSlug={workspaceSlug}
        clubSlug={clubSlug}
        sectionSlug={sectionSlug}
      />
    </ConvexAuthGate>
  )
}

function LiveClubPageInner({
  workspaceSlug,
  clubSlug,
  sectionSlug,
}: {
  workspaceSlug: string
  clubSlug: string
  sectionSlug?: string
}) {
  const conversation = useQuery(channelsApi.conversation, {
    workspaceSlug,
    slug: clubSlug,
  })
  const messages = useQuery(
    channelsApi.listMessages,
    sectionSlug ? { workspaceSlug, slug: clubSlug, sectionSlug } : "skip"
  )
  const clubOps = useQuery(channelsApi.clubOperations, {
    workspaceSlug,
    slug: clubSlug,
  })
  const sendMessage = useMutation(channelsApi.sendMessage)
  const markConversationRead = useMutation(channelsApi.markConversationRead)
  const createDiscussionSection = useMutation(channelsApi.createDiscussionSection)
  const joinOpenClub = useMutation(channelsApi.joinOpenClub)
  const requestToJoin = useMutation(channelsApi.requestToJoin)
  const reviewJoinRequest = useMutation(channelsApi.reviewJoinRequest)
  const leaveChannel = useMutation(channelsApi.leaveChannel)
  const removeMember = useMutation(channelsApi.removeMember)
  const setMemberRole = useMutation(channelsApi.setMemberRole)
  const createClubEvent = useMutation(channelsApi.createClubEvent)
  const joinClubEvent = useMutation(channelsApi.joinClubEvent)
  const checkInClubTicket = useMutation(channelsApi.checkInClubTicket)
  const resetClubTicket = useMutation(channelsApi.resetClubTicket)
  const createClubPoll = useMutation(channelsApi.createClubPoll)
  const voteOnClubPoll = useMutation(channelsApi.voteOnClubPoll)
  const setClubPollStatus = useMutation(channelsApi.setClubPollStatus)
  const [message, setMessage] = useState("")
  const [sectionName, setSectionName] = useState("")
  const [sectionDescription, setSectionDescription] = useState("")
  const [showSectionComposer, setShowSectionComposer] = useState(false)
  const [eventTitle, setEventTitle] = useState("")
  const [eventSummary, setEventSummary] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollDescription, setPollDescription] = useState("")
  const [pollOptions, setPollOptions] = useState("")
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredMemberSearch = useDeferredValue(memberSearch.trim().toLowerCase())
  const isDiscussionView = Boolean(sectionSlug)

  useEffect(() => {
    if (!isDiscussionView || conversation === undefined || messages === undefined) {
      return
    }

    if (!conversation || conversation.kind !== "channel" || !conversation.canViewMessages) {
      return
    }

    void markConversationRead({
      workspaceSlug,
      slug: clubSlug,
    })
  }, [
    clubSlug,
    conversation,
    isDiscussionView,
    markConversationRead,
    messages,
    workspaceSlug,
  ])

  if (
    conversation === undefined ||
    clubOps === undefined ||
    (isDiscussionView && messages === undefined)
  ) {
    return (
      <LiveLoadingState
        title="Loading club"
        body="Syncing messages, sections, and club activity."
      />
    )
  }

  if (
    !conversation ||
    !clubOps ||
    conversation.kind !== "channel"
  ) {
    return (
      <div className="do-surface p-6 md:p-8 lg:p-10">
        <p className="do-eyebrow">Conversation missing</p>
        <h2 className="mt-3 do-subheading">This club space is not available.</h2>
      </div>
    )
  }

  const access =
    conversation.access ?? (conversation.slug === "general" ? "public" : "members")
  const viewerMembershipState =
    conversation.viewerMembershipState ??
    (access === "public" ? "public" : conversation.canManage ? "admin" : "notMember")
  const canViewMessages =
    conversation.canViewMessages ?? (access === "public" || conversation.canManage)
  const canPostMessages = conversation.canPostMessages ?? canViewMessages
  const canJoin = conversation.canJoin ?? false
  const canRequestToJoin = conversation.canRequestToJoin ?? false
  const canLeave = conversation.canLeave ?? false
  const canEditRoles = conversation.canEditRoles ?? false
  const memberCount = conversation.memberCount ?? null
  const members = conversation.members ?? []
  const pendingRequests = conversation.pendingRequests ?? []
  const discussionSections = conversation.discussionSections ?? []
  const selectedSection =
    discussionSections.find((section) => section.slug === sectionSlug) ??
    discussionSections.find((section) =>
      conversation.isGeneral ? section.slug === "feed" : section.slug === "general"
    ) ??
    discussionSections[0] ??
    null
  const filteredMembers = members.filter((member) => {
    if (!deferredMemberSearch) {
      return true
    }

    return `${member.name} ${member.role}`
      .toLowerCase()
      .includes(deferredMemberSearch)
  })
  const overviewHref = workspaceClubPath(workspaceSlug, clubSlug)
  const discussionHref = workspaceClubDiscussionPath(
    workspaceSlug,
    clubSlug,
    selectedSection?.slug ?? defaultDiscussionSlug(conversation.isGeneral)
  )
  const accessLabel = access === "public" ? "Open club" : "Approval required"
  const membershipSummary = membershipLabel(viewerMembershipState)

  const runAction: ActionRunner = (
    key,
    action,
    successMessage,
    onSuccess
  ) => {
    setPendingAction(key)

    startTransition(async () => {
      try {
        await action()
        onSuccess?.()
        toast.success(successMessage)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.")
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()

    if (!trimmed || !selectedSection) {
      return
    }

    runAction(
      "send-message",
      async () => {
        await sendMessage({
          workspaceSlug,
          slug: clubSlug,
          sectionSlug: selectedSection.slug,
          body: trimmed,
        })
      },
      "Message sent",
      () => setMessage("")
    )
  }

  const handleCreateSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    runAction(
      "create-section",
      async () => {
        await createDiscussionSection({
          workspaceSlug,
          slug: clubSlug,
          name: sectionName.trim(),
          description: sectionDescription.trim() || undefined,
        })
      },
      "Discussion section created",
      () => {
        setSectionName("")
        setSectionDescription("")
        setShowSectionComposer(false)
      }
    )
  }

  const handleCreateEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    runAction(
      "create-club-event",
      async () => {
        await createClubEvent({
          workspaceSlug,
          slug: clubSlug,
          title: eventTitle.trim(),
          summary: eventSummary.trim() || undefined,
          date: eventDate,
          time: eventTime.trim(),
          location: eventLocation.trim(),
        })
      },
      "Club event created",
      () => {
        setEventTitle("")
        setEventSummary("")
        setEventDate("")
        setEventTime("")
        setEventLocation("")
      }
    )
  }

  const handleCreatePoll = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const options = pollOptions
      .split("\n")
      .map((option) => option.trim())
      .filter((option) => option.length > 0)

    if (options.length < 2) {
      toast.error("Add at least two poll options, one per line.")
      return
    }

    runAction(
      "create-club-poll",
      async () => {
        await createClubPoll({
          workspaceSlug,
          slug: clubSlug,
          question: pollQuestion.trim(),
          description: pollDescription.trim() || undefined,
          options,
        })
      },
      "Club poll published",
      () => {
        setPollQuestion("")
        setPollDescription("")
        setPollOptions("")
      }
    )
  }

  const membershipSidebar = (
    <>
      <MembershipPanel
        access={access}
        canJoin={canJoin}
        canRequestToJoin={canRequestToJoin}
        canLeave={canLeave}
        canManage={conversation.canManage}
        canEditRoles={canEditRoles}
        viewerMembershipState={viewerMembershipState}
        isPending={isPending}
        pendingAction={pendingAction}
        onJoin={() =>
          runAction(
            "join-open-club",
            () => joinOpenClub({ workspaceSlug, slug: clubSlug }),
            "You joined the club"
          )
        }
        onRequest={() =>
          runAction(
            "request-to-join",
            () => requestToJoin({ workspaceSlug, slug: clubSlug }),
            "Join request sent"
          )
        }
        onLeave={() =>
          runAction(
            "leave-channel",
            () => leaveChannel({ workspaceSlug, slug: clubSlug }),
            "You left the club space"
          )
        }
      />

      {!conversation.isGeneral ? (
        <MembersPanel
          workspaceSlug={workspaceSlug}
          members={members}
          filteredMembers={filteredMembers}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          canManage={conversation.canManage}
          access={access}
          canEditRoles={canEditRoles}
          isPending={isPending}
          pendingAction={pendingAction}
          runAction={runAction}
          clubSlug={clubSlug}
          removeMember={removeMember}
          setMemberRole={setMemberRole}
        />
      ) : null}

      {conversation.canManage ? (
        <PendingRequestsPanel
          workspaceSlug={workspaceSlug}
          clubSlug={clubSlug}
          pendingRequests={pendingRequests}
          isPending={isPending}
          pendingAction={pendingAction}
          runAction={runAction}
          reviewJoinRequest={reviewJoinRequest}
        />
      ) : null}
    </>
  )

  if (!isDiscussionView) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-6">
          <ClubHero
            clubSlug={clubSlug}
            name={conversation.name}
            description={conversation.description}
            category={conversation.category}
            accessLabel={accessLabel}
            overviewActive
            discussionHref={discussionHref}
            overviewHref={overviewHref}
            activityLabel={formatRelativeActivity(selectedSection?.lastMessageAt ?? null)}
            membershipSummary={membershipSummary}
            memberCount={memberCount}
            eventCount={clubOps.events.length}
            pollCount={clubOps.polls.length}
          />

          {!canViewMessages ? (
            <section className="do-card p-6">
              <p className="text-[16px] font-medium text-cream">
                Join this club to unlock its discussion, events, and polls.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {canJoin ? (
                  <ActionButton
                    label="Join club"
                    disabled={isPending && pendingAction === "join-open-club"}
                    onClick={() =>
                      runAction(
                        "join-open-club",
                        () => joinOpenClub({ workspaceSlug, slug: clubSlug }),
                        "You joined the club"
                      )
                    }
                  />
                ) : canRequestToJoin ? (
                  <ActionButton
                    label="Request to join"
                    disabled={isPending && pendingAction === "request-to-join"}
                    onClick={() =>
                      runAction(
                        "request-to-join",
                        () => requestToJoin({ workspaceSlug, slug: clubSlug }),
                        "Join request sent"
                      )
                    }
                  />
                ) : viewerMembershipState === "pending" ? (
                  <span className="do-pill">Your request is waiting for review</span>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="do-panel p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="do-eyebrow">Discussion spaces</p>
                <h3 className="mt-2 text-[24px] font-medium text-cream">Club channels</h3>
                <p className="mt-2 text-[13px] leading-6 text-tan">
                  Separate club info from live discussion and open the exact section you need.
                </p>
              </div>
              {!conversation.isGeneral && conversation.canManage ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSectionComposer((value) => !value)}
                >
                  <PlusIcon className="size-4" />
                  Add section
                </Button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {discussionSections.map((section) => (
                <Link
                  key={section.slug}
                  href={workspaceClubDiscussionPath(workspaceSlug, clubSlug, section.slug)}
                  className="do-card block p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-tan">
                          <HashIcon className="size-3.5" />
                        </span>
                        <p className="truncate text-[15px] font-medium text-cream">
                          {section.name}
                        </p>
                      </div>
                      <p className="mt-3 text-[12px] leading-6 text-tan">
                        {section.description ?? "Club discussion"}
                      </p>
                    </div>
                    <span className="do-pill shrink-0">{section.messageCount}</span>
                  </div>
                  <p className="mt-4 text-[11px] tracking-[0.12em] text-tan uppercase">
                    Activity {formatRelativeActivity(section.lastMessageAt)}
                  </p>
                </Link>
              ))}
            </div>

            {!conversation.isGeneral && conversation.canManage && showSectionComposer ? (
              <form onSubmit={handleCreateSection} className="mt-5 space-y-3 border-t border-hairline/80 pt-5">
                <Input
                  value={sectionName}
                  onChange={(event) => setSectionName(event.target.value)}
                  placeholder="Section name"
                  disabled={isPending && pendingAction === "create-section"}
                />
                <textarea
                  value={sectionDescription}
                  onChange={(event) => setSectionDescription(event.target.value)}
                  placeholder="Short description for this section"
                  className={textareaClassName}
                  disabled={isPending && pendingAction === "create-section"}
                />
                <Button
                  type="submit"
                  disabled={
                    (isPending && pendingAction === "create-section") || !sectionName.trim()
                  }
                >
                  <PlusIcon className="size-4" />
                  Create section
                </Button>
              </form>
            ) : null}
          </section>

          {clubOps.canParticipate ? (
            <>
              <section className="do-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="do-eyebrow">Events</p>
                    <h3 className="mt-2 text-[24px] font-medium text-cream">
                      Events and tickets
                    </h3>
                  </div>
                  {!clubOps.canManage ? (
                    <span className="do-pill">Managers create events</span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 2xl:grid-cols-[320px_1fr]">
                  <div className="do-card p-4">
                    <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                      <TicketIcon className="size-4 text-terracotta" />
                      Create event
                    </div>

                    <form onSubmit={handleCreateEvent} className="mt-4 space-y-3">
                      <Input
                        value={eventTitle}
                        onChange={(event) => setEventTitle(event.target.value)}
                        placeholder="Event title"
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-event")
                        }
                      />
                      <textarea
                        value={eventSummary}
                        onChange={(event) => setEventSummary(event.target.value)}
                        placeholder="What is this event about?"
                        className={textareaClassName}
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-event")
                        }
                      />
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-event")
                        }
                      />
                      <Input
                        value={eventTime}
                        onChange={(event) => setEventTime(event.target.value)}
                        placeholder="6:30 PM"
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-event")
                        }
                      />
                      <Input
                        value={eventLocation}
                        onChange={(event) => setEventLocation(event.target.value)}
                        placeholder="Main auditorium or meeting link"
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-event")
                        }
                      />
                      <Button
                        type="submit"
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-event") ||
                          !eventTitle.trim() ||
                          !eventDate ||
                          !eventTime.trim() ||
                          !eventLocation.trim()
                        }
                      >
                        <PlusIcon className="size-4" />
                        Publish event
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {clubOps.events.length ? (
                      clubOps.events.map((event) => (
                        <div key={event.id} className="do-card p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[18px] font-medium text-cream">
                                  {event.title}
                                </p>
                                <span className="do-pill">{event.status}</span>
                                <span className="do-pill">
                                  <ClipboardListIcon className="size-3.5" />
                                  {event.ticketCount} tickets
                                </span>
                                <span className="do-pill">
                                  <CheckCircle2Icon className="size-3.5" />
                                  {event.checkedInCount} checked in
                                </span>
                              </div>
                              {event.summary ? (
                                <p className="mt-3 text-[13px] leading-6 text-tan">
                                  {event.summary}
                                </p>
                              ) : null}
                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="do-pill">
                                  <CalendarDaysIcon className="size-3.5" />
                                  {formatEventDate(event.date)} · {event.time}
                                </span>
                                <span className="do-pill">
                                  <MapPinIcon className="size-3.5" />
                                  {event.location}
                                </span>
                              </div>
                            </div>

                            {event.viewerTicket ? (
                              <span className="do-pill">Your ticket is ready</span>
                            ) : event.status === "open" ? (
                              <Button
                                disabled={
                                  isPending && pendingAction === `join-event-${event.id}`
                                }
                                onClick={() =>
                                  runAction(
                                    `join-event-${event.id}`,
                                    () =>
                                      joinClubEvent({
                                        workspaceSlug,
                                        slug: clubSlug,
                                        eventId: event.id,
                                      }),
                                    "Ticket generated"
                                  )
                                }
                              >
                                <TicketIcon className="size-4" />
                                Join event
                              </Button>
                            ) : (
                              <span className="do-pill">Ticketing closed</span>
                            )}
                          </div>

                          {event.viewerTicket ? (
                            <div className="relative mt-5 overflow-hidden rounded-[10px] border border-hairline bg-[linear-gradient(180deg,rgba(201,132,122,0.16),rgba(201,132,122,0)_18%),rgba(20,20,22,0.94)] p-5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:content-['']">
                              <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
                                <div>
                                  <p className="do-eyebrow">Your Ticket</p>
                                  <h4 className="mt-2 text-[22px] font-semibold text-parchment">
                                    {event.viewerTicket.eventTitle}
                                  </h4>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="do-pill do-pill-platinum">
                                      {event.viewerTicket.attendeeName}
                                    </span>
                                    <span className="do-pill do-pill-gold">
                                      {event.viewerTicket.organizationName}
                                    </span>
                                    <span className="do-pill do-pill-rose">
                                      {event.viewerTicket.checkedInAt
                                        ? "Checked in"
                                        : "Ready for entry"}
                                    </span>
                                  </div>
                                  <div className="mt-4 rounded-[8px] border border-[rgba(200,169,110,0.18)] bg-[rgba(200,169,110,0.08)] px-3 py-2">
                                    <p className="text-[10px] font-semibold tracking-[0.08em] text-gold uppercase">
                                      Pass Code
                                    </p>
                                    <p className="mt-2 font-mono text-[14px] tracking-[0.12em] text-gold">
                                      {event.viewerTicket.code}
                                    </p>
                                  </div>
                                  <div className="mt-4 space-y-1.5 text-[13px] leading-6 text-tan">
                                    <p>Club: {event.viewerTicket.clubName}</p>
                                    <p>
                                      Entry: {formatEventDate(event.viewerTicket.eventDate)} at{" "}
                                      {event.viewerTicket.eventTime}
                                    </p>
                                    <p>Venue: {event.viewerTicket.eventLocation}</p>
                                  </div>
                                  {event.viewerTicket.attendeeEmail ? (
                                    <p className="mt-1 text-[13px] leading-6 text-tan">
                                      Email: {event.viewerTicket.attendeeEmail}
                                    </p>
                                  ) : null}
                                </div>
                                <TicketQr
                                  value={event.viewerTicket.qrValue}
                                  alt={`${event.viewerTicket.eventTitle} ticket QR`}
                                />
                              </div>
                            </div>
                          ) : null}

                          {clubOps.canManage && event.attendees.length ? (
                            <div className="mt-5 space-y-3">
                              <p className="do-eyebrow">Attendee roster</p>
                              {event.attendees.map((attendee) => (
                                <div
                                  key={attendee.ticketId}
                                  className="rounded-[20px] border border-hairline bg-surface/55 p-4"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <Link
                                      href={workspacePersonPath(workspaceSlug, attendee.userId)}
                                      className="min-w-0 flex-1 text-left"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[15px] font-medium text-cream">
                                          {attendee.name}
                                        </p>
                                        <span className="do-pill">{attendee.code}</span>
                                        <span className="do-pill">
                                          {attendee.checkedInAt ? "Checked in" : "Waiting"}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-[12px] leading-6 text-tan">
                                        {attendee.email ?? "No email synced"}
                                      </p>
                                      <p className="mt-1 text-[12px] leading-6 text-tan">
                                        Claimed {formatShortDate(attendee.createdAt)}
                                        {attendee.checkedInAt
                                          ? ` · Checked in by ${
                                              attendee.checkedInByName ?? "club staff"
                                            }`
                                          : ""}
                                      </p>
                                    </Link>

                                    {attendee.checkedInAt ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                          isPending &&
                                          pendingAction === `reset-ticket-${attendee.ticketId}`
                                        }
                                        onClick={() =>
                                          runAction(
                                            `reset-ticket-${attendee.ticketId}`,
                                            () =>
                                              resetClubTicket({
                                                workspaceSlug,
                                                slug: clubSlug,
                                                ticketId: attendee.ticketId,
                                              }),
                                            "Ticket reset"
                                          )
                                        }
                                      >
                                        Reset
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        disabled={
                                          isPending &&
                                          pendingAction === `checkin-ticket-${attendee.ticketId}`
                                        }
                                        onClick={() =>
                                          runAction(
                                            `checkin-ticket-${attendee.ticketId}`,
                                            () =>
                                              checkInClubTicket({
                                                workspaceSlug,
                                                slug: clubSlug,
                                                ticketId: attendee.ticketId,
                                              }),
                                            "Ticket checked in"
                                          )
                                        }
                                      >
                                        Check in
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-hairline bg-surface/55 p-5 text-[13px] leading-6 text-tan">
                        No events yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="do-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="do-eyebrow">Polls</p>
                    <h3 className="mt-2 text-[24px] font-medium text-cream">
                      Club decisions
                    </h3>
                  </div>
                  {!clubOps.canManage ? (
                    <span className="do-pill">Managers publish polls</span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 2xl:grid-cols-[320px_1fr]">
                  <div className="do-card p-4">
                    <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                      <VoteIcon className="size-4 text-sage" />
                      Create poll
                    </div>

                    <form onSubmit={handleCreatePoll} className="mt-4 space-y-3">
                      <Input
                        value={pollQuestion}
                        onChange={(event) => setPollQuestion(event.target.value)}
                        placeholder="What should the club decide?"
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-poll")
                        }
                      />
                      <textarea
                        value={pollDescription}
                        onChange={(event) => setPollDescription(event.target.value)}
                        placeholder="Optional context"
                        className={textareaClassName}
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-poll")
                        }
                      />
                      <textarea
                        value={pollOptions}
                        onChange={(event) => setPollOptions(event.target.value)}
                        placeholder={"Option one\nOption two\nOption three"}
                        className={textareaClassName}
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-poll")
                        }
                      />
                      <Button
                        type="submit"
                        disabled={
                          !clubOps.canManage ||
                          (isPending && pendingAction === "create-club-poll") ||
                          !pollQuestion.trim() ||
                          !pollOptions.trim()
                        }
                      >
                        <PlusIcon className="size-4" />
                        Publish poll
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {clubOps.polls.length ? (
                      clubOps.polls.map((poll) => (
                        <div key={poll.id} className="do-card p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[17px] font-medium text-cream">
                                  {poll.question}
                                </p>
                                <span className="do-pill">{poll.status}</span>
                                <span className="do-pill">
                                  <ClipboardListIcon className="size-3.5" />
                                  {poll.totalVotes} votes
                                </span>
                              </div>
                              {poll.description ? (
                                <p className="mt-3 text-[13px] leading-6 text-tan">
                                  {poll.description}
                                </p>
                              ) : null}
                            </div>

                            {clubOps.canManage ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  isPending &&
                                  pendingAction === `toggle-club-poll-${poll.id}`
                                }
                                onClick={() =>
                                  runAction(
                                    `toggle-club-poll-${poll.id}`,
                                    () =>
                                      setClubPollStatus({
                                        workspaceSlug,
                                        slug: clubSlug,
                                        pollId: poll.id,
                                        status: poll.status === "open" ? "closed" : "open",
                                      }),
                                    poll.status === "open"
                                      ? "Club poll closed"
                                      : "Club poll reopened"
                                  )
                                }
                              >
                                {poll.status === "open" ? "Close poll" : "Reopen poll"}
                              </Button>
                            ) : null}
                          </div>

                          <div className="mt-4 space-y-3">
                            {poll.options.map((option) => {
                              const isSelected = poll.viewerVoteOptionId === option.id

                              return (
                                <div
                                  key={option.id}
                                  className={cn(
                                    "rounded-[20px] border p-3 transition-colors",
                                    isSelected
                                      ? "border-ring bg-active-row/70"
                                      : "border-hairline bg-surface/55"
                                  )}
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-[14px] font-medium text-cream">
                                        {option.label}
                                      </p>
                                      <p className="mt-1 text-[12px] leading-6 text-tan">
                                        {option.votes} votes · {option.percentage}% of turnout
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={isSelected ? "default" : "outline"}
                                      disabled={
                                        poll.status !== "open" ||
                                        (isPending &&
                                          pendingAction === `vote-club-poll-${poll.id}`)
                                      }
                                      onClick={() =>
                                        runAction(
                                          `vote-club-poll-${poll.id}`,
                                          () =>
                                            voteOnClubPoll({
                                              workspaceSlug,
                                              slug: clubSlug,
                                              pollId: poll.id,
                                              optionId: option.id,
                                            }),
                                          "Vote recorded"
                                        )
                                      }
                                    >
                                      {isSelected ? "Selected" : "Vote"}
                                    </Button>
                                  </div>
                                  <div className="mt-3 h-2 rounded-full bg-field/70">
                                    <div
                                      className={cn(
                                        "h-2 rounded-full transition-[width] duration-200",
                                        isSelected ? "bg-cream" : "bg-sage"
                                      )}
                                      style={{ width: `${option.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="do-pill">Opened by {poll.createdByName}</span>
                            <span className="do-pill">
                              <Clock3Icon className="size-3.5" />
                              {formatShortDate(poll.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-hairline bg-surface/55 p-5 text-[13px] leading-6 text-tan">
                        No polls yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </main>

        <aside className="space-y-4">{membershipSidebar}</aside>
      </div>
    )
  }

  if (!canViewMessages) {
    return (
      <div className="mx-auto w-full max-w-[760px]">
        <section className="do-surface p-6 sm:p-8">
          <Link
            href={workspaceClubsPath(workspaceSlug)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit text-tan")}
          >
            Back to clubs
          </Link>
          <div className="mt-5">
            <p className="do-eyebrow">{conversation.name}</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-cream">
              Discussion locked
            </h2>
            <p className="mt-3 text-[14px] leading-7 text-tan">
              Join this club to open the chat stream for {selectedSection?.name ?? "this section"}.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {canJoin ? (
              <ActionButton
                label="Join club"
                disabled={isPending && pendingAction === "join-open-club"}
                onClick={() =>
                  runAction(
                    "join-open-club",
                    () => joinOpenClub({ workspaceSlug, slug: clubSlug }),
                    "You joined the club"
                  )
                }
              />
            ) : canRequestToJoin ? (
              <ActionButton
                label="Request to join"
                disabled={isPending && pendingAction === "request-to-join"}
                onClick={() =>
                  runAction(
                    "request-to-join",
                    () => requestToJoin({ workspaceSlug, slug: clubSlug }),
                    "Join request sent"
                  )
                }
              />
            ) : viewerMembershipState === "pending" ? (
              <span className="do-pill">Your request is waiting for review</span>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  return (
    <MinimalChatThread
      backHref={workspaceClubsPath(workspaceSlug)}
      backLabel="Clubs"
      title={selectedSection?.name ?? conversation.name}
      subtitle={selectedSection?.description ?? conversation.name}
      scopeLabel={conversation.name}
      headerAction={
        <Link
          href={overviewHref}
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
        >
          Overview
        </Link>
      }
      threadLinks={discussionSections.map((section) => ({
        active: selectedSection?.slug === section.slug,
        href: workspaceClubDiscussionPath(workspaceSlug, clubSlug, section.slug),
        label: section.name,
      }))}
      messages={messages as MessageData[]}
      canPostMessages={canPostMessages}
      draft={message}
      onDraftChange={setMessage}
      onSubmit={handleSubmit}
      isPending={isPending && pendingAction === "send-message"}
      placeholder={
        selectedSection ? `Message #${selectedSection.slug}` : "Message this club"
      }
      emptyState="No messages yet. Start the conversation."
      composerHint={`Keep this section focused on ${selectedSection?.name ?? "the topic"}.`}
      authorHref={(authorId) => workspacePersonPath(workspaceSlug, authorId)}
    />
  )
}
