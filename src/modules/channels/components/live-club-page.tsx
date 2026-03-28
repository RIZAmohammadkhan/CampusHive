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
import { useRouter } from "next/navigation"
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClipboardListIcon,
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
  workspaceTicketsPath,
} from "@/lib/workspaces"
import {
  channelsApi,
  type ClubOperationsData,
  type ConversationData,
  type MessageData,
} from "@/modules/channels/api"
import {
  clubRoleLabel,
  defaultDiscussionSlug,
  formatEventDate,
  formatRelativeActivity,
  formatShortDate,
  membershipLabel,
} from "@/modules/channels/components/conversation-utils"
import { MinimalChatThread } from "@/modules/channels/components/minimal-chat-thread"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

const selectClassName =
  "h-10 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 text-[13px] text-parchment outline-none transition-[border-color,box-shadow] focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"
const textareaClassName =
  "min-h-28 w-full rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-tan focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"
const maxPollOptions = 6

function createEmptyPollOptions() {
  return ["", ""]
}

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
    <div className="inline-flex w-full max-w-full overflow-x-auto rounded-full border border-hairline bg-surface/55 p-1 sm:w-auto">
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
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="do-pill">{category}</span>
            <span className="do-pill">{accessLabel}</span>
            <span className="do-pill">
              <MessageSquareTextIcon className="size-3.5" />
              #{clubSlug}
            </span>
          </div>
          <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-cream sm:text-[30px]">
            {name}
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-tan">{description}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-tan">
            <span>{membershipSummary}</span>
            <span>
              {memberCount !== null ? `${memberCount} members` : "Campus-wide"}
            </span>
            <span>{eventCount} events</span>
            <span>{pollCount} polls</span>
            <span>{activityLabel}</span>
          </div>
        </div>

        <ClubViewTabs
          overviewHref={overviewHref}
          discussionHref={discussionHref}
          overviewActive={overviewActive}
        />
      </div>
    </section>
  )
}

function PollComposerModal({
  open,
  canManage,
  question,
  setQuestion,
  description,
  setDescription,
  options,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean
  canManage: boolean
  question: string
  setQuestion: (value: string) => void
  description: string
  setDescription: (value: string) => void
  options: string[]
  onOptionChange: (index: number, value: string) => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
  isPending: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (!open || !canManage) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="do-surface w-full max-w-2xl p-6 md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="do-eyebrow">New Poll</p>
            <h3 className="mt-2 do-subheading">Post a poll to this channel</h3>
            <p className="mt-3 max-w-xl text-[13px] leading-6 text-tan">
              Ask one clear question, add up to six options, and members can vote
              without leaving the conversation.
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={isPending}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What should this channel decide?"
            disabled={isPending}
            autoFocus
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional context"
            className={textareaClassName}
            disabled={isPending}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium text-parchment">Options</p>
              <span className="text-[12px] text-tan">
                {options.filter((option) => option.trim()).length}/{maxPollOptions}
              </span>
            </div>

            {options.map((option, index) => (
              <div key={`poll-option-${index}`} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(event) => onOptionChange(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  disabled={isPending}
                />
                {options.length > 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onRemoveOption(index)}
                    disabled={isPending}
                  >
                    <XIcon className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}

            {options.length < maxPollOptions ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddOption}
                disabled={isPending}
              >
                <PlusIcon className="size-4" />
                Add option
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-[12px] leading-6 text-tan">
              Members can change their vote while the poll is open.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending ||
                  !question.trim() ||
                  options.filter((option) => option.trim()).length < 2
                }
              >
                <VoteIcon className="size-4" />
                Publish poll
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function ClubEventComposerModal({
  open,
  canManage,
  title,
  setTitle,
  summary,
  setSummary,
  date,
  setDate,
  time,
  setTime,
  location,
  setLocation,
  capacity,
  setCapacity,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean
  canManage: boolean
  title: string
  setTitle: (value: string) => void
  summary: string
  setSummary: (value: string) => void
  date: string
  setDate: (value: string) => void
  time: string
  setTime: (value: string) => void
  location: string
  setLocation: (value: string) => void
  capacity: string
  setCapacity: (value: string) => void
  isPending: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (!open || !canManage) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="do-surface w-full max-w-2xl p-6 md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="do-eyebrow">New Event</p>
            <h3 className="mt-2 do-subheading">Add club ticketing</h3>
            <p className="mt-3 max-w-xl text-[13px] leading-6 text-tan">
              Publish a club event, set an optional capacity, and keep ticket requests in
              one place.
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={isPending}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Event title"
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="md:col-span-2">
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What is this event about?"
              className={textareaClassName}
              disabled={isPending}
            />
          </div>
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={isPending}
          />
          <Input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            placeholder="6:30 PM"
            disabled={isPending}
          />
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Main auditorium or meeting link"
            disabled={isPending}
          />
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="Capacity (optional)"
            disabled={isPending}
          />
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-[12px] leading-6 text-tan">
              Tickets will be managed from this club and also appear on the Events page.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending ||
                  !title.trim() ||
                  !date ||
                  !time.trim() ||
                  !location.trim()
                }
              >
                <PlusIcon className="size-4" />
                Publish event
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function ChannelPollPanel({
  polls,
  canManage,
  isPending,
  pendingAction,
  onCreatePoll,
  onToggleStatus,
  onVote,
}: {
  polls: ClubOperationsData["polls"]
  canManage: boolean
  isPending: boolean
  pendingAction: string | null
  onCreatePoll: () => void
  onToggleStatus: (pollId: string, nextStatus: "open" | "closed") => void
  onVote: (pollId: string, optionId: string, action: "vote" | "remove") => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-parchment">Polls</p>
          <span className="text-[12px] text-tan">{polls.length}</span>
        </div>
        {canManage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreatePoll}
            disabled={isPending && pendingAction === "create-club-poll"}
          >
            <PlusIcon className="size-4" />
            Create poll
          </Button>
        ) : null}
      </div>

      {polls.length ? (
        <div className="space-y-3">
          {polls.map((poll) => (
            <div key={poll.id} className="rounded-[18px] border border-hairline bg-surface/55 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-medium text-cream">{poll.question}</p>
                    <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-tan">
                      {poll.status}
                    </span>
                  </div>
                  {poll.description ? (
                    <p className="mt-2 text-[13px] leading-6 text-tan">{poll.description}</p>
                  ) : null}
                </div>

                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending && pendingAction === `toggle-club-poll-${poll.id}`}
                    onClick={() =>
                      onToggleStatus(
                        poll.id,
                        poll.status === "open" ? "closed" : "open"
                      )
                    }
                  >
                    {poll.status === "open" ? "Close" : "Reopen"}
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {poll.options.map((option) => {
                  const isSelected = poll.viewerVoteOptionId === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        "w-full rounded-[16px] border p-3 text-left transition-colors",
                        isSelected
                          ? "border-[rgba(201,132,122,0.28)] bg-[rgba(201,132,122,0.14)]"
                          : "border-hairline bg-surface/60 hover:bg-surface/80"
                      )}
                      disabled={
                        poll.status !== "open" ||
                        isSelected ||
                        (isPending && pendingAction === `vote-club-poll-${poll.id}`)
                      }
                      onClick={() => onVote(poll.id, option.id, "vote")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckIcon className="size-4 text-cream" />
                            ) : null}
                            <p className="truncate text-[14px] font-medium text-cream">
                              {option.label}
                            </p>
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-tan">
                            {option.votes} votes
                          </p>
                        </div>
                        <span className="shrink-0 text-[12px] font-medium text-tan">
                          {option.percentage}%
                        </span>
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
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-[12px] text-tan">
                  <span>{poll.totalVotes} votes</span>
                  <span>Opened by {poll.createdByName}</span>
                  <span>{formatShortDate(poll.createdAt)}</span>
                </div>

                {poll.status === "open" && poll.viewerVoteOptionId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending && pendingAction === `vote-club-poll-${poll.id}`}
                    onClick={() =>
                      onVote(poll.id, poll.viewerVoteOptionId as string, "remove")
                    }
                  >
                    Take back vote
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border border-dashed border-hairline bg-surface/35 px-4 py-4 text-[12px] leading-6 text-tan">
          No polls yet.
        </div>
      )}
    </div>
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

type TicketVerificationResult = {
  valid: boolean
  canCheckIn: boolean
  status: "pending" | "approved" | "rejected" | "invalid"
  message: string
  ticketId: string | null
  attendeeName: string | null
  attendeeEmail: string | null
  code: string | null
  checkedInAt: number | null
  checkedInByName: string | null
}

function EventWorkflowCard({
  workspaceSlug,
  clubSlug,
  event,
  members,
  canManage,
  canParticipate,
}: {
  workspaceSlug: string
  clubSlug: string
  event: ClubOperationsData["events"][number]
  members: ConversationData["members"]
  canManage: boolean
  canParticipate: boolean
}) {
  const requestClubTicket = useMutation(channelsApi.joinClubEvent)
  const issueClubTickets = useMutation(channelsApi.issueClubTickets)
  const reviewClubEventRequests = useMutation(channelsApi.reviewClubEventRequests)
  const verifyClubTicket = useMutation(channelsApi.verifyClubTicket)
  const checkInClubTicket = useMutation(channelsApi.checkInClubTicket)
  const resetClubTicket = useMutation(channelsApi.resetClubTicket)
  const [memberSearch, setMemberSearch] = useState("")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [verificationValue, setVerificationValue] = useState("")
  const [verificationResult, setVerificationResult] =
    useState<TicketVerificationResult | null>(null)
  const [showAdminTools, setShowAdminTools] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredMemberSearch = useDeferredValue(memberSearch.trim().toLowerCase())
  const approvedUserIds = new Set(event.attendees.map((attendee) => attendee.userId))
  const pendingUserIds = new Set(
    event.pendingRequests.map((request) => request.userId)
  )
  const filteredMembers = members.filter((member) => {
    if (!deferredMemberSearch) {
      return true
    }

    return `${member.name} ${member.role}`.toLowerCase().includes(deferredMemberSearch)
  })

  const runAction = (key: string, action: () => Promise<void>) => {
    setPendingAction(key)

    startTransition(async () => {
      try {
        await action()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.")
      } finally {
        setPendingAction(null)
      }
    })
  }

  const toggleSelectedMember = (userId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId]
    )
  }

  const toggleSelectedRequest = (ticketId: string) => {
    setSelectedRequestIds((current) =>
      current.includes(ticketId)
        ? current.filter((entry) => entry !== ticketId)
        : [...current, ticketId]
    )
  }

  const handleIssueTickets = (userIds: string[], key: string) => {
    runAction(key, async () => {
      const result = await issueClubTickets({
        workspaceSlug,
        slug: clubSlug,
        eventId: event.id,
        userIds,
      })

      setSelectedMemberIds([])

      if (result.issuedCount > 0) {
        toast.success(
          result.skippedCount > 0
            ? `${result.issuedCount} ticket${result.issuedCount === 1 ? "" : "s"} issued, ${result.skippedCount} skipped`
            : `${result.issuedCount} ticket${result.issuedCount === 1 ? "" : "s"} issued`
        )
        return
      }

      toast.success("Selected members already have approved tickets.")
    })
  }

  const handleReviewRequests = (
    ticketIds: string[],
    approve: boolean,
    key: string
  ) => {
    runAction(key, async () => {
      const result = await reviewClubEventRequests({
        workspaceSlug,
        slug: clubSlug,
        eventId: event.id,
        ticketIds,
        approve,
      })

      setSelectedRequestIds([])

      if (result.reviewedCount > 0) {
        toast.success(
          approve
            ? `${result.reviewedCount} request${result.reviewedCount === 1 ? "" : "s"} approved`
            : `${result.reviewedCount} request${result.reviewedCount === 1 ? "" : "s"} rejected`
        )
        return
      }

      toast.success("No pending requests were changed.")
    })
  }

  const handleVerifyTicket = () => {
    setPendingAction(`verify-${event.id}`)

    startTransition(async () => {
      try {
        const result = await verifyClubTicket({
          workspaceSlug,
          slug: clubSlug,
          eventId: event.id,
          value: verificationValue,
        })

        setVerificationResult(result)

        if (result.valid) {
          toast.success(result.message)
        } else {
          toast.error(result.message)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Verification failed.")
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="do-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[18px] font-medium text-cream">{event.title}</p>
            <span className="do-pill">{event.status}</span>
            <span className="do-pill">
              <ClipboardListIcon className="size-3.5" />
              {event.ticketCount} issued
            </span>
            <span className="do-pill">
              <CheckCircle2Icon className="size-3.5" />
              {event.checkedInCount} checked in
            </span>
            {event.pendingRequestCount ? (
              <span className="do-pill">{event.pendingRequestCount} pending</span>
            ) : null}
            {event.capacity !== null ? (
              <span className="do-pill">
                {event.remainingCapacity ?? 0} / {event.capacity} left
              </span>
            ) : null}
          </div>
          {event.summary ? (
            <p className="mt-3 text-[13px] leading-6 text-tan">{event.summary}</p>
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

        <div className="flex shrink-0 flex-col items-start gap-2">
          {event.viewerTicket ? (
            <>
              <span className="do-pill">Ticket approved</span>
              <Link
                href={workspaceTicketsPath(workspaceSlug)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View ticket
              </Link>
            </>
          ) : event.viewerRequestStatus === "pending" ? (
            <>
              <span className="do-pill">Request pending</span>
              <Link
                href={workspaceTicketsPath(workspaceSlug)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open tickets
              </Link>
            </>
          ) : event.status === "open" && canParticipate ? (
            <Button
              disabled={isPending && pendingAction === `request-${event.id}`}
              onClick={() =>
                runAction(`request-${event.id}`, async () => {
                  await requestClubTicket({
                    workspaceSlug,
                    slug: clubSlug,
                    eventId: event.id,
                  })

                  toast.success(
                    event.viewerRequestStatus === "rejected"
                      ? "Ticket request sent again"
                      : "Ticket request sent"
                  )
                })
              }
            >
              <TicketIcon className="size-4" />
              {event.viewerRequestStatus === "rejected" ? "Register again" : "Register"}
            </Button>
          ) : (
            <span className="do-pill">Ticketing closed</span>
          )}
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminTools((current) => !current)}
            >
              {showAdminTools ? "Hide ticketing" : "Manage ticketing"}
            </Button>
          ) : null}
        </div>
      </div>

      {canManage && showAdminTools ? (
        <div className="mt-5 space-y-4">
          {event.pendingRequests.length ? (
            <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[13px] font-medium text-parchment">Pending requests</p>
                  <p className="mt-1 text-[12px] leading-6 text-tan">
                    Approve one by one, in bulk, or all at once.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={
                      selectedRequestIds.length === 0 ||
                      (isPending && pendingAction === `approve-selected-${event.id}`)
                    }
                    onClick={() =>
                      handleReviewRequests(
                        selectedRequestIds,
                        true,
                        `approve-selected-${event.id}`
                      )
                    }
                  >
                    Approve selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      isPending && pendingAction === `approve-all-${event.id}`
                    }
                    onClick={() =>
                      handleReviewRequests(
                        event.pendingRequests.map((request) => request.ticketId),
                        true,
                        `approve-all-${event.id}`
                      )
                    }
                  >
                    Approve all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      selectedRequestIds.length === 0 ||
                      (isPending && pendingAction === `reject-selected-${event.id}`)
                    }
                    onClick={() =>
                      handleReviewRequests(
                        selectedRequestIds,
                        false,
                        `reject-selected-${event.id}`
                      )
                    }
                  >
                    Reject selected
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {event.pendingRequests.map((request) => (
                  <label
                    key={request.ticketId}
                    className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-hairline bg-panel/60 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRequestIds.includes(request.ticketId)}
                      onChange={() => toggleSelectedRequest(request.ticketId)}
                      className="mt-1 size-4 rounded border-hairline bg-field"
                    />
                    <span className="min-w-0 flex-1">
                      <Link
                        href={workspacePersonPath(workspaceSlug, request.userId)}
                        className="block text-[14px] font-medium text-cream"
                      >
                        {request.name}
                      </Link>
                      <span className="mt-1 block text-[12px] leading-6 text-tan">
                        {request.email ?? "No email synced"} · Requested{" "}
                        {formatShortDate(request.createdAt)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[13px] font-medium text-parchment">Issue tickets</p>
                <p className="mt-1 text-[12px] leading-6 text-tan">
                  Select members, issue to a few, or issue to everyone in the club.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={
                    selectedMemberIds.length === 0 ||
                    (isPending && pendingAction === `issue-selected-${event.id}`)
                  }
                  onClick={() =>
                    handleIssueTickets(
                      selectedMemberIds,
                      `issue-selected-${event.id}`
                    )
                  }
                >
                  Issue selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && pendingAction === `issue-all-${event.id}`}
                  onClick={() =>
                    handleIssueTickets(
                      members.map((member) => member.id),
                      `issue-all-${event.id}`
                    )
                  }
                >
                  Issue to all
                </Button>
              </div>
            </div>

            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tan" />
              <Input
                value={memberSearch}
                onChange={(currentEvent) => setMemberSearch(currentEvent.target.value)}
                placeholder="Search members"
                className="pl-9"
              />
            </div>

            <div className="mt-4 max-h-64 space-y-3 overflow-auto pr-1">
              {filteredMembers.map((member) => {
                const alreadyApproved = approvedUserIds.has(member.id)
                const hasPendingRequest = pendingUserIds.has(member.id)
                const disabled = alreadyApproved

                return (
                  <label
                    key={`${event.id}-${member.id}`}
                    className={cn(
                      "flex items-start gap-3 rounded-[14px] border p-3",
                      disabled
                        ? "border-hairline bg-panel/40 opacity-70"
                        : "cursor-pointer border-hairline bg-panel/60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => toggleSelectedMember(member.id)}
                      disabled={disabled}
                      className="mt-1 size-4 rounded border-hairline bg-field"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-cream">
                          {member.name}
                        </span>
                        <span className="do-pill">{clubRoleLabel(member.role)}</span>
                        {alreadyApproved ? <span className="do-pill">Ticketed</span> : null}
                        {hasPendingRequest ? <span className="do-pill">Requested</span> : null}
                      </span>
                      <span className="mt-1 block text-[12px] leading-6 text-tan">
                        Joined {formatShortDate(member.joinedAt)}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
            <p className="text-[13px] font-medium text-parchment">Verify QR or code</p>
            <p className="mt-1 text-[12px] leading-6 text-tan">
              Scanning the QR now checks in automatically. Paste the QR link or ticket
              code here only as a fallback.
            </p>
            <textarea
              value={verificationValue}
              onChange={(currentEvent) => setVerificationValue(currentEvent.target.value)}
              className={`${textareaClassName} mt-4 min-h-24`}
              placeholder="Paste QR payload or ticket code"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={
                  !verificationValue.trim() ||
                  (isPending && pendingAction === `verify-${event.id}`)
                }
                onClick={handleVerifyTicket}
              >
                Verify
              </Button>
              {verificationResult ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVerificationValue("")
                    setVerificationResult(null)
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            {verificationResult ? (
              <div className="mt-4 rounded-[14px] border border-hairline bg-panel/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="do-pill">{verificationResult.status}</span>
                  {verificationResult.code ? (
                    <span className="do-pill">{verificationResult.code}</span>
                  ) : null}
                  {verificationResult.attendeeName ? (
                    <span className="text-[13px] font-medium text-cream">
                      {verificationResult.attendeeName}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  {verificationResult.message}
                </p>
                {verificationResult.attendeeEmail ? (
                  <p className="mt-1 text-[12px] leading-6 text-tan">
                    {verificationResult.attendeeEmail}
                  </p>
                ) : null}
                {verificationResult.checkedInAt ? (
                  <p className="mt-1 text-[12px] leading-6 text-tan">
                    Checked in by {verificationResult.checkedInByName ?? "club staff"}
                  </p>
                ) : null}
                {verificationResult.canCheckIn && verificationResult.ticketId ? (
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={
                      isPending && pendingAction === `verify-checkin-${event.id}`
                    }
                    onClick={() =>
                      runAction(`verify-checkin-${event.id}`, async () => {
                        await checkInClubTicket({
                          workspaceSlug,
                          slug: clubSlug,
                          ticketId: verificationResult.ticketId as string,
                        })

                        setVerificationResult((current) =>
                          current
                            ? {
                                ...current,
                                canCheckIn: false,
                                checkedInAt: Date.now(),
                                message: "Ticket checked in.",
                              }
                            : current
                        )
                        toast.success("Ticket checked in")
                      })
                    }
                  >
                    Check in verified ticket
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {event.attendees.length ? (
            <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
              <p className="text-[13px] font-medium text-parchment">Approved attendees</p>
              <div className="mt-4 space-y-3">
                {event.attendees.map((attendee) => (
                  <div
                    key={attendee.ticketId}
                    className="rounded-[14px] border border-hairline bg-panel/60 p-3"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <Link
                        href={workspacePersonPath(workspaceSlug, attendee.userId)}
                        className="min-w-0 flex-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14px] font-medium text-cream">
                            {attendee.name}
                          </p>
                          <span className="do-pill">{attendee.code}</span>
                          <span className="do-pill">
                            {attendee.checkedInAt ? "Checked in" : "Ready"}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] leading-6 text-tan">
                          {attendee.email ?? "No email synced"} · Approved{" "}
                          {formatShortDate(attendee.approvedAt ?? attendee.createdAt)}
                        </p>
                      </Link>

                      {attendee.checkedInAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            isPending &&
                            pendingAction === `reset-ticket-${attendee.ticketId}`
                          }
                          onClick={() =>
                            runAction(`reset-ticket-${attendee.ticketId}`, async () => {
                              await resetClubTicket({
                                workspaceSlug,
                                slug: clubSlug,
                                ticketId: attendee.ticketId,
                              })
                              toast.success("Ticket reset")
                            })
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
                            runAction(`checkin-ticket-${attendee.ticketId}`, async () => {
                              await checkInClubTicket({
                                workspaceSlug,
                                slug: clubSlug,
                                ticketId: attendee.ticketId,
                              })
                              toast.success("Ticket checked in")
                            })
                          }
                        >
                          Check in
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : event.viewerTicket ? (
        <div className="mt-5 rounded-[18px] border border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
          Your ticket is approved and saved in the Tickets sidebar.
        </div>
      ) : event.viewerRequestStatus === "pending" ? (
        <div className="mt-5 rounded-[18px] border border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
          Your registration is waiting for admin approval. You can track it from the
          Tickets sidebar.
        </div>
      ) : null}
    </div>
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
  const router = useRouter()
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
    sectionSlug,
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
  const createClubPoll = useMutation(channelsApi.createClubPoll)
  const voteOnClubPoll = useMutation(channelsApi.voteOnClubPoll)
  const setClubPollStatus = useMutation(channelsApi.setClubPollStatus)
  const setDiscussionSectionReplyAccess = useMutation(
    channelsApi.setDiscussionSectionReplyAccess
  )
  const [message, setMessage] = useState("")
  const [sectionName, setSectionName] = useState("")
  const [sectionDescription, setSectionDescription] = useState("")
  const [showSectionComposer, setShowSectionComposer] = useState(false)
  const [isReplyAccessPanelOpen, setIsReplyAccessPanelOpen] = useState(false)
  const [replyAccessMode, setReplyAccessMode] = useState<"everyone" | "selected">(
    "everyone"
  )
  const [allowedReplyUserIds, setAllowedReplyUserIds] = useState<string[]>([])
  const [replyAccessSearch, setReplyAccessSearch] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [eventSummary, setEventSummary] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [eventCapacity, setEventCapacity] = useState("")
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollDescription, setPollDescription] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>(createEmptyPollOptions)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredMemberSearch = useDeferredValue(memberSearch.trim().toLowerCase())
  const deferredReplyAccessSearch = useDeferredValue(
    replyAccessSearch.trim().toLowerCase()
  )
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

  useEffect(() => {
    if (!conversation || conversation.kind !== "channel") {
      return
    }

    const nextDiscussionSections = conversation.discussionSections ?? []
    const nextSelectedSection =
      nextDiscussionSections.find((section) => section.slug === sectionSlug) ??
      nextDiscussionSections.find((section) =>
        conversation.isGeneral ? section.slug === "feed" : section.slug === "general"
      ) ??
      nextDiscussionSections[0] ??
      null

    if (!nextSelectedSection) {
      return
    }

    setReplyAccessMode(nextSelectedSection.replyAccessMode)
    setAllowedReplyUserIds(nextSelectedSection.allowedReplyUserIds)
    setReplyAccessSearch("")
    setIsReplyAccessPanelOpen(false)
  }, [conversation, sectionSlug])

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
  const canPostMessages =
    selectedSection?.canReply ?? (conversation.canPostMessages ?? canViewMessages)
  const filteredMembers = members.filter((member) => {
    if (!deferredMemberSearch) {
      return true
    }

    return `${member.name} ${member.role}`
      .toLowerCase()
      .includes(deferredMemberSearch)
  })
  const filteredReplyAccessMembers = members.filter((member) => {
    if (!deferredReplyAccessSearch) {
      return true
    }

    return `${member.name} ${member.role}`
      .toLowerCase()
      .includes(deferredReplyAccessSearch)
  })
  const overviewHref = workspaceClubPath(workspaceSlug, clubSlug)
  const discussionHref = workspaceClubDiscussionPath(
    workspaceSlug,
    clubSlug,
    selectedSection?.slug ?? defaultDiscussionSlug(conversation.isGeneral)
  )
  const accessLabel = access === "public" ? "Open club" : "Approval required"
  const membershipSummary = membershipLabel(viewerMembershipState)
  const showPollPanel = clubOps.polls.length > 0

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
        const result = await createDiscussionSection({
          workspaceSlug,
          slug: clubSlug,
          name: sectionName.trim(),
          description: sectionDescription.trim() || undefined,
        })

        router.push(workspaceClubDiscussionPath(workspaceSlug, clubSlug, result.slug))
      },
      "Channel created",
      () => {
        setSectionName("")
        setSectionDescription("")
        setShowSectionComposer(false)
      }
    )
  }

  const resetReplyAccessDraft = () => {
    if (!selectedSection) {
      return
    }

    setReplyAccessMode(selectedSection.replyAccessMode)
    setAllowedReplyUserIds(selectedSection.allowedReplyUserIds)
    setReplyAccessSearch("")
  }

  const handleToggleSectionComposer = () => {
    setIsReplyAccessPanelOpen(false)
    setShowSectionComposer((value) => !value)
  }

  const handleToggleReplyAccessPanel = () => {
    setShowSectionComposer(false)
    resetReplyAccessDraft()
    setIsReplyAccessPanelOpen((value) => !value)
  }

  const handleToggleAllowedReplyUserId = (userId: string) => {
    setAllowedReplyUserIds((current) =>
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId]
    )
  }

  const handleCloseReplyAccessPanel = () => {
    resetReplyAccessDraft()
    setIsReplyAccessPanelOpen(false)
  }

  const handleSaveReplyAccess = () => {
    if (!selectedSection) {
      return
    }

    runAction(
      "set-reply-access",
      () =>
        setDiscussionSectionReplyAccess({
          workspaceSlug,
          slug: clubSlug,
          sectionSlug: selectedSection.slug,
          replyAccessMode,
          allowedUserIds:
            replyAccessMode === "selected" ? allowedReplyUserIds : [],
        }),
      "Reply access updated",
      () => {
        setReplyAccessSearch("")
        setIsReplyAccessPanelOpen(false)
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
          capacity: eventCapacity.trim() ? Number(eventCapacity) : undefined,
        })
      },
      "Club event created",
      () => {
        setEventTitle("")
        setEventSummary("")
        setEventDate("")
        setEventTime("")
        setEventLocation("")
        setEventCapacity("")
        setIsEventComposerOpen(false)
      }
    )
  }

  const handleCloseEventComposer = () => {
    if (isPending && pendingAction === "create-club-event") {
      return
    }

    setIsEventComposerOpen(false)
  }

  const handleCreatePoll = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const options = pollOptions
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
          sectionSlug: selectedSection?.slug,
          question: pollQuestion.trim(),
          description: pollDescription.trim() || undefined,
          options,
        })
      },
      "Club poll published",
      () => {
        setPollQuestion("")
        setPollDescription("")
        setPollOptions(createEmptyPollOptions())
        setIsPollComposerOpen(false)
      }
    )
  }

  const handleOpenPollComposer = () => {
    setIsPollComposerOpen(true)
  }

  const handleClosePollComposer = () => {
    if (isPending && pendingAction === "create-club-poll") {
      return
    }

    setIsPollComposerOpen(false)
  }

  const handlePollOptionChange = (index: number, value: string) => {
    setPollOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    )
  }

  const handleAddPollOption = () => {
    setPollOptions((current) =>
      current.length >= maxPollOptions ? current : [...current, ""]
    )
  }

  const handleRemovePollOption = (index: number) => {
    setPollOptions((current) =>
      current.filter((_, optionIndex) => optionIndex !== index)
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
      <>
        <ClubEventComposerModal
          open={isEventComposerOpen}
          canManage={clubOps.canManage}
          title={eventTitle}
          setTitle={setEventTitle}
          summary={eventSummary}
          setSummary={setEventSummary}
          date={eventDate}
          setDate={setEventDate}
          time={eventTime}
          setTime={setEventTime}
          location={eventLocation}
          setLocation={setEventLocation}
          capacity={eventCapacity}
          setCapacity={setEventCapacity}
          isPending={isPending && pendingAction === "create-club-event"}
          onClose={handleCloseEventComposer}
          onSubmit={handleCreateEvent}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5 sm:space-y-6">
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
            </section>

            {clubOps.canParticipate ? (
              <section className="do-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="do-eyebrow">Events</p>
                    <h3 className="mt-2 text-[24px] font-medium text-cream">Event ticketing</h3>
                  </div>
                  {clubOps.canManage ? (
                    <Button onClick={() => setIsEventComposerOpen(true)}>
                      <PlusIcon className="size-4" />
                      Add event
                    </Button>
                  ) : (
                    <span className="do-pill">Register and track approvals from Tickets</span>
                  )}
                </div>

                <div className="mt-5 space-y-4">
                  {clubOps.events.length ? (
                    clubOps.events.map((event) => (
                      <EventWorkflowCard
                        key={event.id}
                        workspaceSlug={workspaceSlug}
                        clubSlug={clubSlug}
                        event={event}
                        members={members}
                        canManage={clubOps.canManage}
                        canParticipate={clubOps.canParticipate}
                      />
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-hairline bg-surface/55 p-5 text-[13px] leading-6 text-tan">
                      No events yet.
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <section className="do-panel p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="do-eyebrow">Polls</p>
                  <h3 className="mt-2 text-[20px] font-medium text-cream">
                    Use polls in channels
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-tan">
                    Open a discussion section to create and vote on polls in context.
                  </p>
                </div>
                <Link
                  href={discussionHref}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full justify-center sm:w-fit"
                  )}
                >
                  Open discussion
                </Link>
              </div>
            </section>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-[5.5rem]">{membershipSidebar}</aside>
        </div>
      </>
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
    <>
      <PollComposerModal
        open={isPollComposerOpen}
        canManage={clubOps.canManage}
        question={pollQuestion}
        setQuestion={setPollQuestion}
        description={pollDescription}
        setDescription={setPollDescription}
        options={pollOptions}
        onOptionChange={handlePollOptionChange}
        onAddOption={handleAddPollOption}
        onRemoveOption={handleRemovePollOption}
        isPending={isPending && pendingAction === "create-club-poll"}
        onClose={handleClosePollComposer}
        onSubmit={handleCreatePoll}
      />

      <MinimalChatThread
        backHref={workspaceClubsPath(workspaceSlug)}
        backLabel="Clubs"
        title={selectedSection?.name ?? conversation.name}
        subtitle={selectedSection?.description ?? conversation.name}
        scopeLabel={conversation.name}
        headerAction={
          <Link
            href={overviewHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            Overview
          </Link>
        }
        threadLinks={discussionSections.map((section) => ({
          active: selectedSection?.slug === section.slug,
          href: workspaceClubDiscussionPath(workspaceSlug, clubSlug, section.slug),
          label: section.name,
        }))}
        threadLinksAction={
          clubOps.canManage || (!conversation.isGeneral && conversation.canManage) ? (
            <div className="flex items-center gap-2">
              {clubOps.canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleOpenPollComposer}
                  disabled={isPending && pendingAction === "create-club-poll"}
                >
                  <VoteIcon className="size-4" />
                  Create poll
                </Button>
              ) : null}
              {!conversation.isGeneral && selectedSection ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleToggleReplyAccessPanel}
                  disabled={isPending && pendingAction === "set-reply-access"}
                >
                  <ShieldCheckIcon className="size-4" />
                  Reply access
                </Button>
              ) : null}
              {!conversation.isGeneral && conversation.canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleToggleSectionComposer}
                  disabled={isPending && pendingAction === "create-section"}
                >
                  <PlusIcon className="size-4" />
                  Add channel
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
        threadLinksPanel={
          !conversation.isGeneral && conversation.canManage ? (
            showSectionComposer ? (
              <form
                onSubmit={handleCreateSection}
                className="rounded-[18px] border border-hairline bg-surface/45 p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-center">
                  <Input
                    value={sectionName}
                    onChange={(event) => setSectionName(event.target.value)}
                    placeholder="Channel name"
                    disabled={isPending && pendingAction === "create-section"}
                  />
                  <Input
                    value={sectionDescription}
                    onChange={(event) => setSectionDescription(event.target.value)}
                    placeholder="Short description (optional)"
                    disabled={isPending && pendingAction === "create-section"}
                  />
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSectionComposer(false)}
                      disabled={isPending && pendingAction === "create-section"}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        (isPending && pendingAction === "create-section") ||
                        !sectionName.trim()
                      }
                    >
                      <PlusIcon className="size-4" />
                      Create channel
                    </Button>
                  </div>
                </div>
              </form>
            ) : isReplyAccessPanelOpen && selectedSection ? (
              <div className="rounded-[18px] border border-hairline bg-surface/45 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-cream">
                        Reply access for #{selectedSection.name}
                      </p>
                      <p className="mt-1 text-[12px] leading-6 text-tan">
                        Managers can always reply. Everyone else follows the list below.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={replyAccessMode === "everyone" ? "secondary" : "outline"}
                        onClick={() => setReplyAccessMode("everyone")}
                      >
                        Everyone
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={replyAccessMode === "selected" ? "secondary" : "outline"}
                        onClick={() => setReplyAccessMode("selected")}
                      >
                        Selected people
                      </Button>
                    </div>
                  </div>

                  {replyAccessMode === "selected" ? (
                    <>
                      <Input
                        value={replyAccessSearch}
                        onChange={(event) => setReplyAccessSearch(event.target.value)}
                        placeholder="Search members"
                        disabled={isPending && pendingAction === "set-reply-access"}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {filteredReplyAccessMembers.map((member) => {
                          const isSelected = allowedReplyUserIds.includes(member.id)

                          return (
                            <label
                              key={member.id}
                              className={cn(
                                "flex items-center gap-3 rounded-[14px] border px-3 py-3 transition-colors",
                                isSelected
                                  ? "border-[rgba(201,132,122,0.22)] bg-[rgba(201,132,122,0.12)]"
                                  : "border-hairline bg-surface/55"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAllowedReplyUserId(member.id)}
                                className="size-4 rounded border border-hairline bg-field accent-[var(--rose)]"
                                disabled={isPending && pendingAction === "set-reply-access"}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-cream">
                                  {member.name}
                                </span>
                                <span className="mt-1 block text-[11px] text-tan capitalize">
                                  {member.role}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                      {!filteredReplyAccessMembers.length ? (
                        <p className="text-[12px] leading-6 text-tan">
                          No members match your search.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-[12px] leading-6 text-tan">
                      Everyone who can view this channel can reply in it.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCloseReplyAccessPanel}
                      disabled={isPending && pendingAction === "set-reply-access"}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveReplyAccess}
                      disabled={isPending && pendingAction === "set-reply-access"}
                    >
                      Save access
                    </Button>
                  </div>
                </div>
              </div>
            ) : undefined
          ) : undefined
        }
        topContent={
          showPollPanel ? (
            <ChannelPollPanel
              polls={clubOps.polls}
              canManage={clubOps.canManage}
              isPending={isPending}
              pendingAction={pendingAction}
              onCreatePoll={handleOpenPollComposer}
              onToggleStatus={(pollId, nextStatus) =>
                runAction(
                  `toggle-club-poll-${pollId}`,
                  () =>
                    setClubPollStatus({
                      workspaceSlug,
                      slug: clubSlug,
                      pollId,
                      status: nextStatus,
                    }),
                  nextStatus === "closed" ? "Poll closed" : "Poll reopened"
                )
              }
              onVote={(pollId, optionId, action) =>
                runAction(
                  `vote-club-poll-${pollId}`,
                  () =>
                    voteOnClubPoll({
                      workspaceSlug,
                      slug: clubSlug,
                      pollId,
                      optionId,
                    }),
                  action === "remove" ? "Vote removed" : "Vote recorded"
                )
              }
            />
          ) : undefined
        }
        messages={messages as MessageData[]}
        canPostMessages={canPostMessages}
        draft={message}
        onDraftChange={setMessage}
        onSubmit={handleSubmit}
        isPending={isPending && pendingAction === "send-message"}
        placeholder={
          selectedSection ? `Message #${selectedSection.slug}` : "Message this club"
        }
        emptyState="No messages yet."
        readOnlyMessage={
          selectedSection?.replyAccessMode === "selected"
            ? "Only selected members can reply in this channel."
            : undefined
        }
        authorHref={(authorId) => workspacePersonPath(workspaceSlug, authorId)}
      />
    </>
  )
}
