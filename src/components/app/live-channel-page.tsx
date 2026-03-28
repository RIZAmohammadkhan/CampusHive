"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  SendHorizonalIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  XIcon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { LiveLoadingState } from "@/components/app/live-loading-state"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { convexApi } from "@/lib/convex-api"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"

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

function membershipLabel(
  membershipState: "public" | "admin" | "member" | "pending" | "notMember"
) {
  if (membershipState === "public") return "Campus-wide access"
  if (membershipState === "admin") return "Institute admin access"
  if (membershipState === "member") return "Joined member"
  if (membershipState === "pending") return "Request pending"
  return "Join required"
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
        body="This route expects a Convex deployment for persisted messages, campus roles, and live updates."
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
  const sendMessage = useMutation(convexApi.chat.sendMessage)
  const requestToJoin = useMutation(convexApi.chat.requestToJoin)
  const reviewJoinRequest = useMutation(convexApi.chat.reviewJoinRequest)
  const leaveChannel = useMutation(convexApi.chat.leaveChannel)
  const removeMember = useMutation(convexApi.chat.removeMember)
  const [message, setMessage] = useState("")
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (conversation === undefined || messages === undefined) {
    return (
      <LiveLoadingState
        title="Loading club space"
        body="Convex is connecting this community so message history and new replies stay synced in realtime."
      />
    )
  }

  if (conversation === null) {
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
  const canViewMessages = conversation.canViewMessages ?? (access === "public" || conversation.canManage)
  const canPostMessages = conversation.canPostMessages ?? canViewMessages
  const canRequestToJoin = conversation.canRequestToJoin ?? false
  const canLeave = conversation.canLeave ?? false
  const memberCount = conversation.memberCount ?? null
  const members = conversation.members ?? []
  const pendingRequests = conversation.pendingRequests ?? []

  const runAction = (
    key: string,
    action: () => Promise<unknown>,
    successMessage: string
  ) => {
    setPendingAction(key)

    startTransition(async () => {
      try {
        await action()
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
        setMessage("")
      },
      "Message sent"
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="do-surface flex min-h-[680px] flex-col">
        <header className="border-b border-hairline px-6 py-6">
          <div className="flex flex-col gap-4">
            <Link
              href={workspacePath(workspaceSlug, "/channels")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-fit"
              )}
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
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4 px-6 py-6">
          {!canViewMessages ? (
            <div className="do-card p-6">
              <p className="text-[16px] font-medium text-cream">
                Join this club space to unlock the conversation.
              </p>
              <p className="mt-3 max-w-2xl text-[13px] leading-7 text-tan">
                Members-only clubs keep planning, announcements, and club context in
                one place. Once an institute admin approves your request, the message
                history and posting tools appear here automatically.
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
          ) : messages.length === 0 ? (
            <div className="do-card p-5 text-[13px] leading-6 text-tan">
              No messages yet. Start the conversation and CampusHive will keep the
              context visible for everyone who enters this space after you.
            </div>
          ) : (
            messages.map((entry) => (
              <article key={entry.id} className="do-card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[13px] font-medium text-cream">
                    {entry.author.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium text-cream">
                        {entry.author.name}
                      </p>
                      {entry.author.isCurrentUser ? <span className="do-pill">You</span> : null}
                      <span className="text-[10px] tracking-[0.14em] text-tan uppercase">
                        {formatMessageTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-[13px] leading-7 text-tan">
                      {entry.body}
                    </p>
                  </div>
                </div>
              </article>
            ))
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
                : "This club keeps its discussion and planning inside a real member list. Students can request access, admins can approve, and members can leave when needed."}
            </div>
            {conversation.canManage ? (
              <div className="rounded-2xl border border-hairline bg-surface/55 p-4">
                <span className="inline-flex items-center gap-2 text-parchment">
                  <ShieldCheckIcon className="size-4 text-sage" />
                  You can approve requests and remove members in this club space.
                </span>
              </div>
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
            <div className="mt-5 space-y-3">
              {members.length ? (
                members.map((member) => (
                  <div key={member.id} className="do-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] text-cream">
                        {member.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-medium text-cream">
                            {member.name}
                          </p>
                          {member.isCurrentUser ? <span className="do-pill">You</span> : null}
                        </div>
                        <p className="mt-1 text-[12px] leading-6 text-tan">
                          Joined {formatShortDate(member.joinedAt)}
                        </p>
                      </div>
                      {conversation.canManage ? (
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
                  <div className="flex items-start gap-3">
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
                  </div>
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
    </div>
  )
}
