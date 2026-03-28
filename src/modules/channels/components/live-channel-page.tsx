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
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClipboardListIcon,
  Clock3Icon,
  HashIcon,
  LockKeyholeIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SearchIcon,
  SendHorizonalIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserMinusIcon,
  VoteIcon,
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
import { workspacePath } from "@/lib/workspaces"
import { channelsApi, type MessageData } from "@/modules/channels/api"
import { TicketQr } from "@/modules/channels/components/ticket-qr"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { MemberProfileSheet } from "@/modules/workspace/components/member-profile-sheet"

const selectClassName =
  "h-10 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 text-[13px] text-parchment outline-none transition-[border-color,box-shadow] focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"
const textareaClassName =
  "min-h-28 w-full rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-tan focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"
const composerClassName =
  "min-h-24 w-full rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-4 py-3 text-[14px] leading-6 text-parchment outline-none transition-[border-color,box-shadow] placeholder:text-tan focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))
}

function formatTimelineDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`))
}

function formatRelativeActivity(timestamp: number | null) {
  if (!timestamp) {
    return "No activity yet"
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
  if (membershipState === "public") return "Campus-wide access"
  if (membershipState === "admin") return "College admin access"
  if (membershipState === "owner") return "Club owner"
  if (membershipState === "officer") return "Club officer"
  if (membershipState === "member") return "Joined member"
  if (membershipState === "pending") return "Request pending"
  return "Join required"
}

function clubRoleLabel(role: "owner" | "officer" | "member") {
  if (role === "owner") return "Owner"
  if (role === "officer") return "Officer"
  return "Member"
}

function clubInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (words.length === 0) {
    return "CL"
  }

  return words.map((word) => word.charAt(0).toUpperCase()).join("")
}

function sameDay(left: number, right: number) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

type TimelineItem =
  | {
      type: "divider"
      key: string
      label: string
    }
  | {
      type: "group"
      key: string
      author: MessageData["author"]
      createdAt: number
      entries: MessageData[]
    }

function buildMessageTimeline(messages: MessageData[]): TimelineItem[] {
  const items: TimelineItem[] = []
  let currentGroup: TimelineItem | null = null
  let lastDayKey: string | null = null

  for (const entry of messages) {
    const dayKey = new Date(entry.createdAt).toDateString()

    if (dayKey !== lastDayKey) {
      items.push({
        type: "divider",
        key: `day-${dayKey}`,
        label: formatTimelineDate(entry.createdAt),
      })
      lastDayKey = dayKey
      currentGroup = null
    }

    const previousEntry =
      currentGroup?.type === "group"
        ? currentGroup.entries[currentGroup.entries.length - 1]
        : null
    const withinFiveMinutes =
      previousEntry !== null &&
      entry.createdAt - previousEntry.createdAt < 5 * 60_000

    if (
      currentGroup?.type === "group" &&
      currentGroup.author.id === entry.author.id &&
      sameDay(currentGroup.createdAt, entry.createdAt) &&
      withinFiveMinutes
    ) {
      currentGroup.entries.push(entry)
      continue
    }

    currentGroup = {
      type: "group",
      key: entry.id,
      author: entry.author,
      createdAt: entry.createdAt,
      entries: [entry],
    }
    items.push(currentGroup)
  }

  return items
}

function sectionHref(
  workspaceSlug: string,
  clubSlug: string,
  sectionSlug?: string
) {
  return sectionSlug
    ? workspacePath(workspaceSlug, `/channels/${clubSlug}/${sectionSlug}`)
    : workspacePath(workspaceSlug, `/channels/${clubSlug}`)
}

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

export function LiveChannelPage({
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
      <LiveChannelPageInner
        workspaceSlug={workspaceSlug}
        clubSlug={clubSlug}
        sectionSlug={sectionSlug}
      />
    </ConvexAuthGate>
  )
}

function LiveChannelPageInner({
  workspaceSlug,
  clubSlug,
  sectionSlug,
}: {
  workspaceSlug: string
  clubSlug: string
  sectionSlug?: string
}) {
  const router = useRouter()
  const conversation = useQuery(channelsApi.conversation, {
    workspaceSlug,
    slug: clubSlug,
  })
  const messages = useQuery(channelsApi.listMessages, {
    workspaceSlug,
    slug: clubSlug,
    sectionSlug,
  })
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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredMemberSearch = useDeferredValue(memberSearch.trim().toLowerCase())

  useEffect(() => {
    if (conversation === undefined || conversation === null || messages === undefined) {
      return
    }

    const nextAccess =
      conversation.access ??
      (conversation.slug === "general" ? "public" : "members")
    const nextCanViewMessages =
      conversation.canViewMessages ??
      (nextAccess === "public" || conversation.canManage)

    if (!nextCanViewMessages) {
      return
    }

    void markConversationRead({
      workspaceSlug,
      slug: clubSlug,
    })
  }, [conversation, messages, clubSlug, markConversationRead, workspaceSlug])

  if (
    conversation === undefined ||
    messages === undefined ||
    clubOps === undefined
  ) {
    return (
      <LiveLoadingState
        title="Loading club"
        body="Syncing messages, sections, and club activity."
      />
    )
  }

  if (conversation === null || clubOps === null) {
    return (
      <div className="do-surface p-6 md:p-8 lg:p-10">
        <p className="do-eyebrow">Conversation missing</p>
        <h2 className="mt-3 do-subheading">
          This club space is not available.
        </h2>
      </div>
    )
  }

  const access =
    conversation.access ?? (conversation.slug === "general" ? "public" : "members")
  const viewerMembershipState =
    conversation.viewerMembershipState ??
    (access === "public" ? "public" : conversation.canManage ? "admin" : "notMember")
  const viewerClubRole = conversation.viewerClubRole ?? null
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
  const timeline = buildMessageTimeline(messages)
  const isDirectMessage = conversation.kind === "dm"

  const backLabel = isDirectMessage ? "Messages" : "Clubs"
  const categoryLabel = isDirectMessage
    ? "Direct message"
    : conversation.category
  const accessLabel = isDirectMessage
    ? "Private chat"
    : access === "public"
      ? "Open club"
      : "Approval required"
  const membershipSummary = isDirectMessage
    ? "Private conversation"
    : membershipLabel(viewerMembershipState)
  const detailEyebrow = isDirectMessage ? "Direct message" : "Club details"
  const sectionEyebrow = isDirectMessage ? "Thread" : "Current section"
  const sectionTitle = selectedSection
    ? isDirectMessage
      ? selectedSection.name
      : `# ${selectedSection.name}`
    : isDirectMessage
      ? "Direct message"
      : "Discussion"
  const sectionSummary =
    selectedSection?.description ??
    (isDirectMessage
      ? "A private conversation between workspace members."
      : "Keep discussion organized by topic instead of one long club feed.")
  const emptyTimelineLabel = isDirectMessage
    ? `No messages yet. Say hello to ${conversation.name}.`
    : "No messages yet in this section. Start the conversation."

  const runAction = (
    key: string,
    action: () => Promise<unknown>,
    successMessage: string,
    onSuccess?: () => void
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
        const result = await createDiscussionSection({
          workspaceSlug,
          slug: clubSlug,
          name: sectionName.trim(),
          description: sectionDescription.trim() || undefined,
        })

        router.push(sectionHref(workspaceSlug, clubSlug, result.slug))
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

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="space-y-4">
        <section className="do-panel p-5">
          <Link
            href={workspacePath(workspaceSlug, "/channels")}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-fit text-tan"
            )}
          >
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Link>

          <div className="mt-5 rounded-[28px] border border-hairline bg-surface/60 p-5">
            <div className="flex size-16 items-center justify-center rounded-[20px] border border-hairline bg-panel/90 text-[20px] font-semibold tracking-[0.12em] text-cream">
              {clubInitials(conversation.name)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="do-pill">{categoryLabel}</span>
              <span className="do-pill">
                {isDirectMessage ? (
                  <>
                    <MessageSquareTextIcon className="size-3.5" />
                    Private
                  </>
                ) : access === "members" ? (
                  <>
                    <LockKeyholeIcon className="size-3.5" />
                    Approval
                  </>
                ) : (
                  "Open"
                )}
              </span>
            </div>
            <h2 className="mt-4 text-[24px] font-semibold text-cream">
              {conversation.name}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-tan">
              {conversation.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="do-pill">{membershipSummary}</span>
              {!isDirectMessage && viewerClubRole ? (
                <span className="do-pill">Your role: {clubRoleLabel(viewerClubRole)}</span>
              ) : null}
            </div>
          </div>
        </section>

        {selectedSection ? (
          <section className="do-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="do-eyebrow">Discussion</p>
                <h3 className="mt-2 text-[20px] font-medium text-cream">
                  {isDirectMessage ? "Private thread" : "Club channels"}
                </h3>
              </div>
              {!isDirectMessage && !conversation.isGeneral && conversation.canManage ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSectionComposer((value) => !value)}
                >
                  <PlusIcon className="size-4" />
                  Add
                </Button>
              ) : null}
            </div>

            <div className="mt-5 space-y-1.5">
              {discussionSections.map((section) => {
                const isActive = selectedSection.slug === section.slug

                return (
                  <Link
                    key={section.slug}
                    href={sectionHref(workspaceSlug, clubSlug, section.slug)}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-[18px] border px-3 py-3 transition-colors",
                      isActive
                        ? "border-hairline bg-active-row/80 text-cream"
                        : "border-transparent bg-surface/35 text-tan hover:border-hairline hover:bg-surface/65 hover:text-cream"
                    )}
                  >
                    <span className="flex min-w-0 gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/85 text-tan">
                        <HashIcon className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">
                          {section.name}
                        </span>
                        <span className="mt-1 block truncate text-[11px] leading-5 opacity-80">
                          {section.description ?? "Club discussion"}
                        </span>
                      </span>
                    </span>
                    <span className="text-[11px] text-tan">{section.messageCount}</span>
                  </Link>
                )
              })}
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
                  placeholder="Short description for this channel"
                  className={textareaClassName}
                  disabled={isPending && pendingAction === "create-section"}
                />
                <Button
                  type="submit"
                  disabled={
                    (isPending && pendingAction === "create-section") ||
                    !sectionName.trim()
                  }
                >
                  <PlusIcon className="size-4" />
                  Create section
                </Button>
              </form>
            ) : null}
          </section>
        ) : null}

        {!isDirectMessage ? (
          <section className="do-panel p-5">
            <p className="do-eyebrow">Quick glance</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Members</p>
                <p className="mt-2 text-[18px] font-medium text-cream">
                  {memberCount !== null ? memberCount : "Campus-wide"}
                </p>
              </div>
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Events</p>
                <p className="mt-2 text-[18px] font-medium text-cream">
                  {clubOps.events.length}
                </p>
              </div>
              <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Polls</p>
                <p className="mt-2 text-[18px] font-medium text-cream">
                  {clubOps.polls.length}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </aside>

      <main className="space-y-6">
        <section className="do-surface overflow-hidden">
          <div className="border-b border-hairline px-6 py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="do-pill">{detailEyebrow}</span>
                  <span className="do-pill">
                    <MessageSquareTextIcon className="size-3.5" />
                    {isDirectMessage ? "Direct message" : `#${conversation.slug}`}
                  </span>
                  {selectedSection ? (
                    <span className="do-pill">
                      <HashIcon className="size-3.5" />
                      {selectedSection.slug}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-4 text-[30px] font-semibold tracking-tight text-cream">
                  {conversation.name}
                </h1>
                <p className="mt-3 max-w-3xl text-[14px] leading-7 text-tan">
                  {conversation.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
                  <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Access</p>
                  <p className="mt-2 text-[14px] font-medium text-cream">{accessLabel}</p>
                </div>
                <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
                  <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Section</p>
                  <p className="mt-2 text-[14px] font-medium text-cream">
                    {selectedSection?.name ?? "Overview"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-hairline bg-surface/55 px-4 py-3">
                  <p className="text-[10px] tracking-[0.15em] text-tan uppercase">Activity</p>
                  <p className="mt-2 text-[14px] font-medium text-cream">
                    {selectedSection
                      ? formatRelativeActivity(selectedSection.lastMessageAt)
                      : "No activity yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <section className="do-panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="do-eyebrow">{sectionEyebrow}</p>
                  <h3 className="mt-2 text-[22px] font-medium text-cream">{sectionTitle}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-tan">{sectionSummary}</p>
                </div>
                {selectedSection ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="do-pill">{selectedSection.messageCount} messages</span>
                    <span className="do-pill">
                      {formatRelativeActivity(selectedSection.lastMessageAt)}
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            {!canViewMessages ? (
              <section className="do-card p-6">
                <p className="text-[16px] font-medium text-cream">
                  {isDirectMessage
                    ? "This direct message is not available yet."
                    : "Join this club to unlock its discussion, events, and polls."}
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
            ) : (
              <section id="club-discussion" className="do-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="do-eyebrow">Discussion</p>
                    <h3 className="mt-2 text-[24px] font-medium text-cream">
                      {selectedSection
                        ? isDirectMessage
                          ? selectedSection.name
                          : `# ${selectedSection.name}`
                        : isDirectMessage
                          ? "Direct message"
                          : "Club discussion"}
                    </h3>
                  </div>
                  <span className="do-pill">
                    {selectedSection ? `${selectedSection.messageCount} messages` : "0 messages"}
                  </span>
                </div>

                <div className="mt-5 rounded-[24px] border border-hairline bg-black/10">
                  <div className="max-h-[640px] space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
                    {timeline.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-hairline bg-surface/45 p-5 text-[13px] leading-6 text-tan">
                        {emptyTimelineLabel}
                      </div>
                    ) : (
                      timeline.map((item) =>
                        item.type === "divider" ? (
                          <div key={item.key} className="flex items-center gap-3 py-2">
                            <div className="h-px flex-1 bg-hairline" />
                            <span className="text-[10px] tracking-[0.16em] text-tan uppercase">
                              {item.label}
                            </span>
                            <div className="h-px flex-1 bg-hairline" />
                          </div>
                        ) : (
                          <article key={item.key} className="rounded-[22px] px-1 py-2">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream"
                                onClick={() => setSelectedMemberId(item.author.id)}
                              >
                                {item.author.name.charAt(0)}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className="truncate text-left text-[15px] font-medium text-cream hover:text-parchment"
                                    onClick={() => setSelectedMemberId(item.author.id)}
                                  >
                                    {item.author.name}
                                  </button>
                                  {item.author.isCurrentUser ? (
                                    <span className="do-pill">You</span>
                                  ) : null}
                                  <span className="text-[10px] tracking-[0.14em] text-tan uppercase">
                                    {formatMessageTime(item.createdAt)}
                                  </span>
                                </div>
                                <div className="mt-2 space-y-2">
                                  {item.entries.map((entry) => (
                                    <p
                                      key={entry.id}
                                      className="text-[14px] leading-7 text-tan"
                                    >
                                      {entry.body}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </article>
                        )
                      )
                    )}
                  </div>

                  {canPostMessages ? (
                    <form onSubmit={handleSubmit} className="border-t border-hairline px-4 py-4 sm:px-5">
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={
                          isDirectMessage
                            ? `Message ${conversation.name}`
                            : selectedSection
                              ? `Message #${selectedSection.slug}`
                              : "Message this club"
                        }
                        className={composerClassName}
                        disabled={isPending && pendingAction === "send-message"}
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[12px] leading-6 text-tan">
                          {isDirectMessage
                            ? "Private messages stay between the participants."
                            : `Keep this section focused on ${selectedSection?.name ?? "the current topic"}.`}
                        </p>
                        <Button
                          type="submit"
                          disabled={
                            (isPending && pendingAction === "send-message") ||
                            !message.trim()
                          }
                        >
                          Send
                          <SendHorizonalIcon className="size-4" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="border-t border-hairline px-4 py-4 text-[13px] leading-6 text-tan sm:px-5">
                      Discussion is read-only right now.
                    </div>
                  )}
                </div>
              </section>
            )}

            {!isDirectMessage && clubOps.canParticipate ? (
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
                                    isPending &&
                                    pendingAction === `join-event-${event.id}`
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
                                      <button
                                        type="button"
                                        className="min-w-0 flex-1 text-left"
                                        onClick={() => setSelectedMemberId(attendee.userId)}
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
                                      </button>

                                      {attendee.checkedInAt ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={
                                            isPending &&
                                            pendingAction ===
                                              `reset-ticket-${attendee.ticketId}`
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
                                            pendingAction ===
                                              `checkin-ticket-${attendee.ticketId}`
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
                                          status:
                                            poll.status === "open" ? "closed" : "open",
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
          </div>
        </section>
      </main>

      <aside className="space-y-4">
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
            {conversation.canManage ? (
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
                disabled={isPending && pendingAction === "join-open-club-side"}
                onClick={() =>
                  runAction(
                    "join-open-club-side",
                    () => joinOpenClub({ workspaceSlug, slug: clubSlug }),
                    "You joined the club"
                  )
                }
              />
            ) : canRequestToJoin ? (
              <ActionButton
                label="Request to join"
                disabled={isPending && pendingAction === "request-to-join-side"}
                onClick={() =>
                  runAction(
                    "request-to-join-side",
                    () => requestToJoin({ workspaceSlug, slug: clubSlug }),
                    "Join request sent"
                  )
                }
              />
            ) : null}
            {canLeave ? (
              <ActionButton
                label="Leave club"
                variant="outline"
                disabled={isPending && pendingAction === "leave-channel"}
                onClick={() =>
                  runAction(
                    "leave-channel",
                    () => leaveChannel({ workspaceSlug, slug: clubSlug }),
                    "You left the club space"
                  )
                }
              />
            ) : null}
            {viewerMembershipState === "pending" ? (
              <span className="do-pill">Join request pending</span>
            ) : null}
          </div>
        </section>

        {!conversation.isGeneral ? (
          <section className="do-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="do-eyebrow">Members</p>
                <h3 className="mt-2 text-[20px] font-medium text-cream">
                  Enrolled roster
                </h3>
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
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        onClick={() => setSelectedMemberId(member.id)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                          {member.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[14px] font-medium text-cream">
                              {member.name}
                            </p>
                            <span className="do-pill">{clubRoleLabel(member.role)}</span>
                            {member.isCurrentUser ? (
                              <span className="do-pill">You</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-6 text-tan">
                            Joined {formatShortDate(member.joinedAt)}
                          </p>
                        </div>
                      </button>
                      {conversation.canManage && access === "members" ? (
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
                                      role: event.target.value as
                                        | "owner"
                                        | "officer"
                                        | "member",
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
        ) : null}

        {conversation.canManage && pendingRequests.length ? (
          <section className="do-panel p-5">
            <p className="do-eyebrow">Pending Requests</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Awaiting approval
            </h3>
            <div className="mt-5 space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.userId} className="do-card p-4">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => setSelectedMemberId(request.userId)}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                      {request.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-cream">
                        {request.name}
                      </p>
                      <p className="mt-1 text-[12px] leading-6 text-tan">
                        Requested {formatShortDate(request.createdAt)}
                      </p>
                    </div>
                  </button>
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
        ) : null}
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
