"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  Clock3Icon,
  LockKeyholeIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SendHorizonalIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserMinusIcon,
  VoteIcon,
  XIcon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { LiveLoadingState } from "@/components/app/live-loading-state"
import { MemberProfileSheet } from "@/components/app/member-profile-sheet"
import { TicketQr } from "@/components/app/ticket-qr"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { convexApi } from "@/lib/convex-api"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"

const selectClassName =
  "h-10 rounded-2xl border border-hairline bg-field/90 px-3 text-[13px] text-parchment outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
const textareaClassName =
  "min-h-28 w-full rounded-2xl border border-hairline bg-field/90 px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-colors duration-150 ease-out placeholder:text-tan focus:border-ring focus:ring-3 focus:ring-ring/30"

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

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`))
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
  if (membershipState === "admin") return "Institute admin access"
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

export function LiveChannelPage({
  workspaceSlug,
  slug,
}: {
  workspaceSlug: string
  slug: string
}) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Club conversations need Convex."
        body="This route expects a Convex deployment for persisted messages, club event tickets, member profiles, and live polls."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveChannelPageInner workspaceSlug={workspaceSlug} slug={slug} />
    </ConvexAuthGate>
  )
}

function LiveChannelPageInner({
  workspaceSlug,
  slug,
}: {
  workspaceSlug: string
  slug: string
}) {
  const conversation = useQuery(convexApi.chat.conversation, {
    workspaceSlug,
    slug,
  })
  const messages = useQuery(convexApi.chat.listMessages, {
    workspaceSlug,
    slug,
  })
  const clubOps = useQuery(convexApi.chat.clubOperations, {
    workspaceSlug,
    slug,
  })
  const sendMessage = useMutation(convexApi.chat.sendMessage)
  const requestToJoin = useMutation(convexApi.chat.requestToJoin)
  const reviewJoinRequest = useMutation(convexApi.chat.reviewJoinRequest)
  const leaveChannel = useMutation(convexApi.chat.leaveChannel)
  const removeMember = useMutation(convexApi.chat.removeMember)
  const setMemberRole = useMutation(convexApi.chat.setMemberRole)
  const createClubEvent = useMutation(convexApi.chat.createClubEvent)
  const joinClubEvent = useMutation(convexApi.chat.joinClubEvent)
  const checkInClubTicket = useMutation(convexApi.chat.checkInClubTicket)
  const resetClubTicket = useMutation(convexApi.chat.resetClubTicket)
  const createClubPoll = useMutation(convexApi.chat.createClubPoll)
  const voteOnClubPoll = useMutation(convexApi.chat.voteOnClubPoll)
  const setClubPollStatus = useMutation(convexApi.chat.setClubPollStatus)
  const [message, setMessage] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [eventSummary, setEventSummary] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollDescription, setPollDescription] = useState("")
  const [pollOptions, setPollOptions] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (
    conversation === undefined ||
    messages === undefined ||
    clubOps === undefined
  ) {
    return (
      <LiveLoadingState
        title="Loading club space"
        body="Convex is connecting club chat, member details, event tickets, and live polls."
      />
    )
  }

  if (conversation === null || clubOps === null) {
    return (
      <div className="do-surface p-6 md:p-8 lg:p-10">
        <p className="do-eyebrow">Conversation missing</p>
        <h2 className="mt-3 do-subheading">
          This club space is not available in the campus.
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-7 text-tan">
          It may have been removed, or you may be following an outdated link.
        </p>
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
  const canRequestToJoin = conversation.canRequestToJoin ?? false
  const canLeave = conversation.canLeave ?? false
  const canEditRoles = conversation.canEditRoles ?? false
  const memberCount = conversation.memberCount ?? null
  const members = conversation.members ?? []
  const pendingRequests = conversation.pendingRequests ?? []

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()

    if (!trimmed) {
      return
    }

    runAction(
      "send-message",
      async () => {
        await sendMessage({
          workspaceSlug,
          slug,
          body: trimmed,
        })
      },
      "Message sent",
      () => setMessage("")
    )
  }

  const handleCreateEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    runAction(
      "create-club-event",
      async () => {
        await createClubEvent({
          workspaceSlug,
          slug,
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

  const handleCreatePoll = (event: React.FormEvent<HTMLFormElement>) => {
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
          slug,
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
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="do-surface flex min-h-[680px] flex-col">
        <header className="border-b border-hairline px-6 py-6">
          <div className="flex flex-col gap-4">
            <Link
              href={workspacePath(workspaceSlug, "/channels")}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
            >
              <ArrowLeftIcon className="size-4" />
              All club spaces
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="do-eyebrow">Club Space</p>
                  {access === "members" ? (
                    <span className="do-pill">
                      <LockKeyholeIcon className="size-3.5" />
                      Members
                    </span>
                  ) : (
                    <span className="do-pill">Campus-wide</span>
                  )}
                  <span className="do-pill">
                    {membershipLabel(viewerMembershipState)}
                  </span>
                </div>
                <h2 className="mt-2 do-subheading">{conversation.name}</h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-tan">
                  {conversation.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="do-pill">
                  <MessageSquareTextIcon className="size-3.5" />
                  #{conversation.slug}
                </span>
                {memberCount !== null ? (
                  <span className="do-pill">{memberCount} members</span>
                ) : null}
                <span className="do-pill">{clubOps.events.length} events</span>
                <span className="do-pill">{clubOps.polls.length} polls</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 px-6 py-6">
          {!canViewMessages ? (
            <div className="do-card p-6">
              <p className="text-[16px] font-medium text-cream">
                Join this club space to unlock its events, tickets, and discussion.
              </p>
              <p className="mt-3 max-w-2xl text-[13px] leading-7 text-tan">
                This club keeps event registration, voting, and chat together. Once
                your request is approved, ticket claiming and club polls will appear
                here automatically.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {canRequestToJoin ? (
                  <Button
                    disabled={isPending && pendingAction === "request-to-join"}
                    onClick={() =>
                      runAction(
                        "request-to-join",
                        () => requestToJoin({ workspaceSlug, slug }),
                        "Join request sent"
                      )
                    }
                  >
                    Request to join
                  </Button>
                ) : viewerMembershipState === "pending" ? (
                  <span className="do-pill">Your request is waiting for review</span>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <section className="do-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="do-eyebrow">Club Events & Tickets</p>
                    <h3 className="mt-2 text-[24px] font-medium text-cream">
                      Join events inside the club and carry a real ticket
                    </h3>
                  </div>
                  {!clubOps.canManage ? (
                    <span className="do-pill">Managers create events</span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
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
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-event")}
                      />
                      <textarea
                        value={eventSummary}
                        onChange={(event) => setEventSummary(event.target.value)}
                        placeholder="What is this event about?"
                        className={textareaClassName}
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-event")}
                      />
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-event")}
                      />
                      <Input
                        value={eventTime}
                        onChange={(event) => setEventTime(event.target.value)}
                        placeholder="6:30 PM"
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-event")}
                      />
                      <Input
                        value={eventLocation}
                        onChange={(event) => setEventLocation(event.target.value)}
                        placeholder="Main auditorium or meeting link"
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-event")}
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
                                disabled={isPending && pendingAction === `join-event-${event.id}`}
                                onClick={() =>
                                  runAction(
                                    `join-event-${event.id}`,
                                    () =>
                                      joinClubEvent({
                                        workspaceSlug,
                                        slug,
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
                            <div className="mt-5 rounded-[24px] border border-hairline bg-surface/55 p-4">
                              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                                <div>
                                  <p className="do-eyebrow">Your Ticket</p>
                                  <h4 className="mt-2 text-[22px] font-medium text-cream">
                                    {event.viewerTicket.eventTitle}
                                  </h4>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="do-pill">
                                      {event.viewerTicket.attendeeName}
                                    </span>
                                    <span className="do-pill">
                                      {event.viewerTicket.organizationName}
                                    </span>
                                    <span className="do-pill">
                                      {event.viewerTicket.code}
                                    </span>
                                    <span className="do-pill">
                                      {event.viewerTicket.checkedInAt
                                        ? "Checked in"
                                        : "Ready for entry"}
                                    </span>
                                  </div>
                                  <p className="mt-4 text-[13px] leading-6 text-tan">
                                    Club: {event.viewerTicket.clubName}
                                  </p>
                                  <p className="mt-1 text-[13px] leading-6 text-tan">
                                    Entry: {formatEventDate(event.viewerTicket.eventDate)} at{" "}
                                    {event.viewerTicket.eventTime}
                                  </p>
                                  <p className="mt-1 text-[13px] leading-6 text-tan">
                                    Venue: {event.viewerTicket.eventLocation}
                                  </p>
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
                                          pendingAction === `reset-ticket-${attendee.ticketId}`
                                        }
                                        onClick={() =>
                                          runAction(
                                            `reset-ticket-${attendee.ticketId}`,
                                            () =>
                                              resetClubTicket({
                                                workspaceSlug,
                                                slug,
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
                                                slug,
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
                        No club events yet. Create one on the left and members will be
                        able to join it from this page and receive a QR ticket.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="do-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="do-eyebrow">Club Polls</p>
                    <h3 className="mt-2 text-[24px] font-medium text-cream">
                      Keep club decisions beside the event they affect
                    </h3>
                  </div>
                  {!clubOps.canManage ? (
                    <span className="do-pill">Managers publish polls</span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
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
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-poll")}
                      />
                      <textarea
                        value={pollDescription}
                        onChange={(event) => setPollDescription(event.target.value)}
                        placeholder="Optional context"
                        className={textareaClassName}
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-poll")}
                      />
                      <textarea
                        value={pollOptions}
                        onChange={(event) => setPollOptions(event.target.value)}
                        placeholder={"Option one\nOption two\nOption three"}
                        className={textareaClassName}
                        disabled={!clubOps.canManage || (isPending && pendingAction === "create-club-poll")}
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
                                        slug,
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
                                  className={`rounded-[20px] border p-3 transition-colors ${
                                    isSelected
                                      ? "border-ring bg-active-row/70"
                                      : "border-hairline bg-surface/55"
                                  }`}
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
                                              slug,
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
                                      className={`h-2 rounded-full transition-[width] duration-200 ${
                                        isSelected ? "bg-cream" : "bg-sage"
                                      }`}
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
                        No club polls yet. Publish one here so attendance, topics, or
                        logistics decisions stay tied to this club.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="do-eyebrow">Club Chat</p>
                    <h3 className="mt-2 text-[22px] font-medium text-cream">
                      Keep the discussion with the event context
                    </h3>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="do-card p-5 text-[13px] leading-6 text-tan">
                    No messages yet. Start the conversation and CampusHive will keep
                    the context visible for everyone who enters this space after you.
                  </div>
                ) : (
                  messages.map((entry) => (
                    <article key={entry.id} className="do-card p-5">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          className="flex items-start gap-4 text-left"
                          onClick={() => setSelectedMemberId(entry.author.id)}
                        >
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream">
                            {entry.author.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-medium text-cream">
                                {entry.author.name}
                              </p>
                              {entry.author.isCurrentUser ? (
                                <span className="do-pill">You</span>
                              ) : null}
                              <span className="text-[10px] tracking-[0.14em] text-tan uppercase">
                                {formatMessageTime(entry.createdAt)}
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                      <p className="mt-3 max-w-3xl text-[13px] leading-7 text-tan">
                        {entry.body}
                      </p>
                    </article>
                  ))
                )}
              </section>
            </>
          )}
        </div>

        {canPostMessages ? (
          <footer className="border-t border-hairline px-4 py-4">
            <form
              onSubmit={handleSubmit}
              className="rounded-[24px] border border-hairline bg-panel/70 p-4 backdrop-blur"
            >
              <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={`Message ${conversation.name}...`}
                  className="h-12 flex-1"
                  disabled={isPending && pendingAction === "send-message"}
                />
                <button
                  type="submit"
                  disabled={isPending && pendingAction === "send-message"}
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Send
                  <SendHorizonalIcon className="size-4" />
                </button>
              </div>
            </form>
          </footer>
        ) : null}
      </section>

      <aside className="space-y-4">
        <section className="do-panel p-5">
          <p className="do-eyebrow">Membership</p>
          <h3 className="mt-2 text-[20px] font-medium text-cream">
            {access === "public"
              ? "This space is open across the campus"
              : "Join requests and club membership"}
          </h3>
          <div className="mt-5 space-y-3 text-[13px] leading-6 text-tan">
            <div className="rounded-2xl border border-hairline bg-surface/55 p-4">
              {access === "public"
                ? "Campus Feed remains readable and postable for the whole campus, so major updates never disappear behind private club membership."
                : "This club keeps its discussion, event tickets, and polls inside a real member list. Students can request access, admins can approve, and members can leave when needed."}
            </div>
            {conversation.canManage ? (
              <div className="rounded-2xl border border-hairline bg-surface/55 p-4">
                <span className="inline-flex items-center gap-2 text-parchment">
                  <ShieldCheckIcon className="size-4 text-sage" />
                  {canEditRoles
                    ? "You can review requests, manage members, events, and update club roles here."
                    : "You can review requests and manage members in this club space."}
                </span>
              </div>
            ) : null}
            {viewerClubRole ? (
              <span className="do-pill">Your role: {clubRoleLabel(viewerClubRole)}</span>
            ) : null}
            {canRequestToJoin ? (
              <Button
                disabled={isPending && pendingAction === "request-to-join-side"}
                onClick={() =>
                  runAction(
                    "request-to-join-side",
                    () => requestToJoin({ workspaceSlug, slug }),
                    "Join request sent"
                  )
                }
              >
                Request to join
              </Button>
            ) : null}
            {canLeave ? (
              <Button
                variant="outline"
                disabled={isPending && pendingAction === "leave-channel"}
                onClick={() =>
                  runAction(
                    "leave-channel",
                    () => leaveChannel({ workspaceSlug, slug }),
                    "You left the club space"
                  )
                }
              >
                Leave club
              </Button>
            ) : null}
            {viewerMembershipState === "pending" ? (
              <span className="do-pill">Join request pending</span>
            ) : null}
          </div>
        </section>

        {access === "members" ? (
          <section className="do-panel p-5">
            <p className="do-eyebrow">Members</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Current club roster
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-tan">
              Click a member to open their profile with organization, name details,
              memberships, and recent tickets.
            </p>
            <div className="mt-5 space-y-3">
              {members.length ? (
                members.map((member) => (
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
                            {member.isCurrentUser ? <span className="do-pill">You</span> : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-6 text-tan">
                            Joined {formatShortDate(member.joinedAt)}
                          </p>
                        </div>
                      </button>
                      {conversation.canManage ? (
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
                                      slug,
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
                                    slug,
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
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  No members yet. The first approved students will appear here.
                </div>
              )}
            </div>
          </section>
        ) : null}

        {conversation.canManage && pendingRequests.length ? (
          <section className="do-panel p-5">
            <p className="do-eyebrow">Pending Requests</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Students waiting for approval
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
                              slug,
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
                              slug,
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
