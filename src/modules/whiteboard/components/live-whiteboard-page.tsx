"use client"

import { useDeferredValue, useState, useTransition } from "react"
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  Clock3Icon,
  PlusIcon,
  QrCodeIcon,
  RefreshCcwIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  VoteIcon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { whiteboardApi } from "@/modules/whiteboard/api"

const textareaClassName =
  "min-h-28 w-full rounded-2xl border border-hairline bg-field/90 px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-colors duration-150 ease-out placeholder:text-tan focus:border-ring focus:ring-3 focus:ring-ring/30"

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

export function LiveWhiteboardPage({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Gate and polling views need a live Convex deployment."
        body="Presence, pass issuance, check-in actions, and poll results now come from Convex so this control room can stay operational instead of static."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveWhiteboardPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveWhiteboardPageInner({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const data = useQuery(whiteboardApi.controlRoom, { workspaceSlug })
  const createGatePass = useMutation(whiteboardApi.createGatePass)
  const scanGatePass = useMutation(whiteboardApi.scanGatePass)
  const resetGatePass = useMutation(whiteboardApi.resetGatePass)
  const createPoll = useMutation(whiteboardApi.createPoll)
  const voteOnPoll = useMutation(whiteboardApi.voteOnPoll)
  const setPollStatus = useMutation(whiteboardApi.setPollStatus)
  const [attendeeName, setAttendeeName] = useState("")
  const [attendeeEmail, setAttendeeEmail] = useState("")
  const [gateNote, setGateNote] = useState("")
  const [scanCode, setScanCode] = useState("")
  const [gateSearch, setGateSearch] = useState("")
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollDescription, setPollDescription] = useState("")
  const [pollOptions, setPollOptions] = useState("")
  const [pendingPassId, setPendingPassId] = useState<string | null>(null)
  const [pendingPollId, setPendingPollId] = useState<string | null>(null)
  const [isCreatingPass, startCreatePassTransition] = useTransition()
  const [isScanningPass, startScanPassTransition] = useTransition()
  const [isUpdatingPass, startPassActionTransition] = useTransition()
  const [isCreatingPoll, startCreatePollTransition] = useTransition()
  const [isUpdatingPoll, startPollActionTransition] = useTransition()
  const deferredGateSearch = useDeferredValue(gateSearch.trim().toLowerCase())

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading control room"
        body="Convex is syncing gate passes, check-in state, live polls, and campus ops presence."
      />
    )
  }

  const filteredGatePasses = data.gatePasses.filter((pass) => {
    if (!deferredGateSearch) {
      return true
    }

    return [pass.attendeeName, pass.code, pass.attendeeEmail ?? "", pass.note ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(deferredGateSearch)
  })

  const handleCreateGatePass = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextAttendeeName = attendeeName.trim()

    startCreatePassTransition(async () => {
      try {
        const result = await createGatePass({
          workspaceSlug,
          attendeeName: nextAttendeeName,
          attendeeEmail: attendeeEmail.trim() || undefined,
          note: gateNote.trim() || undefined,
        })

        setAttendeeName("")
        setAttendeeEmail("")
        setGateNote("")
        toast.success(`Pass issued for ${nextAttendeeName}: ${result.code}`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to issue gate pass."
        )
      }
    })
  }

  const handleScanPass = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const code = scanCode.trim().toUpperCase()

    if (!code) {
      toast.error("Enter a gate pass code to check someone in.")
      return
    }

    startScanPassTransition(async () => {
      try {
        const result = await scanGatePass({
          workspaceSlug,
          code,
        })

        setScanCode("")
        toast.success(`${result.attendeeName} checked in`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to check in gate pass."
        )
      }
    })
  }

  const handleCheckInFromList = (passId: string, code: string, attendee: string) => {
    setPendingPassId(passId)

    startPassActionTransition(async () => {
      try {
        await scanGatePass({
          workspaceSlug,
          code,
        })
        toast.success(`${attendee} checked in`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to check in gate pass."
        )
      } finally {
        setPendingPassId(null)
      }
    })
  }

  const handleResetPass = (passId: string, attendee: string) => {
    setPendingPassId(passId)

    startPassActionTransition(async () => {
      try {
        await resetGatePass({
          workspaceSlug,
          passId,
        })
        toast.success(`Entry reset for ${attendee}`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reset gate pass."
        )
      } finally {
        setPendingPassId(null)
      }
    })
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

    startCreatePollTransition(async () => {
      try {
        await createPoll({
          workspaceSlug,
          question: pollQuestion.trim(),
          description: pollDescription.trim() || undefined,
          options,
        })

        setPollQuestion("")
        setPollDescription("")
        setPollOptions("")
        toast.success("Poll published")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create poll.")
      }
    })
  }

  const handleVote = (pollId: string, optionId: string) => {
    setPendingPollId(pollId)

    startPollActionTransition(async () => {
      try {
        await voteOnPoll({
          workspaceSlug,
          pollId,
          optionId,
        })
        toast.success("Vote recorded")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to record vote.")
      } finally {
        setPendingPollId(null)
      }
    })
  }

  const handlePollStatus = (pollId: string, status: "open" | "closed") => {
    setPendingPollId(pollId)

    startPollActionTransition(async () => {
      try {
        await setPollStatus({
          workspaceSlug,
          pollId,
          status,
        })
        toast.success(status === "closed" ? "Poll closed" : "Poll reopened")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update poll status."
        )
      } finally {
        setPendingPollId(null)
      }
    })
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="do-eyebrow">Gate Passes & Polls</p>
            <h2 className="do-heading max-w-3xl">
              Run entry lines and live decisions from one cleaner control room.
            </h2>
            <p className="max-w-2xl do-copy">
              Gate passes now persist, the desk can check people in live, and campus
              polls keep results updated for everyone in the workspace.
            </p>
          </div>

          <div className="do-panel p-5">
            <p className="do-stat-label">Operations Status</p>
            <p className="mt-3 text-[22px] font-medium text-cream">
              {data.canManage
                ? "Issue passes, run the check-in desk, and launch polls from this page."
                : "Follow live entry activity here and vote on open campus decisions."}
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              {data.activeNow} people are active in campus ops right now, so gate
              movement and poll turnout can update without leaving the workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summary.map((metric) => (
          <div key={metric.label} className="do-card p-5">
            <p className="do-stat-label">{metric.label}</p>
            <p className="mt-4 do-stat-value">{metric.value}</p>
            <p className="mt-2 text-[12px] leading-6 text-tan">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="do-panel p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="do-eyebrow">Gate Desk</p>
                <h3 className="mt-2 do-subheading">Issue passes and process entry</h3>
              </div>
              {!data.canManage ? <span className="do-pill">Institute admins only</span> : null}
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
              <div className="space-y-4">
                <div className="do-card p-4">
                  <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                    <QrCodeIcon className="size-4 text-terracotta" />
                    Issue gate pass
                  </div>

                  <form onSubmit={handleCreateGatePass} className="mt-4 space-y-3">
                    <Input
                      value={attendeeName}
                      onChange={(event) => setAttendeeName(event.target.value)}
                      placeholder="Attendee name"
                      disabled={!data.canManage || isCreatingPass}
                    />
                    <Input
                      value={attendeeEmail}
                      onChange={(event) => setAttendeeEmail(event.target.value)}
                      placeholder="Email address (optional)"
                      disabled={!data.canManage || isCreatingPass}
                    />
                    <textarea
                      value={gateNote}
                      onChange={(event) => setGateNote(event.target.value)}
                      placeholder="Door note or event context (optional)"
                      className={textareaClassName}
                      disabled={!data.canManage || isCreatingPass}
                    />
                    <Button
                      type="submit"
                      disabled={!data.canManage || isCreatingPass || !attendeeName.trim()}
                    >
                      <PlusIcon className="size-4" />
                      Issue pass
                    </Button>
                  </form>
                </div>

                <div className="do-card p-4">
                  <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                    <ScanLineIcon className="size-4 text-slate" />
                    Check-in console
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-tan">
                    Enter a pass code or use the quick actions beside each attendee.
                  </p>

                  <form onSubmit={handleScanPass} className="mt-4 space-y-3">
                    <Input
                      value={scanCode}
                      onChange={(event) => setScanCode(event.target.value.toUpperCase())}
                      placeholder="CH8F4M2"
                      disabled={!data.canManage || isScanningPass}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={!data.canManage || isScanningPass || !scanCode.trim()}
                    >
                      <ShieldCheckIcon className="size-4" />
                      Check in by code
                    </Button>
                  </form>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="do-eyebrow">Recent passes</p>
                    <p className="mt-2 text-[13px] leading-6 text-tan">
                      Pending entries stay pinned to the top so the desk stays focused.
                    </p>
                  </div>
                  <Input
                    value={gateSearch}
                    onChange={(event) => setGateSearch(event.target.value)}
                    placeholder="Search name or code"
                    className="sm:max-w-[240px]"
                  />
                </div>

                {filteredGatePasses.length ? (
                  <div className="space-y-3 xl:max-h-[640px] xl:overflow-y-auto xl:pr-1">
                    {filteredGatePasses.map((pass) => (
                      <div key={pass.id} className="do-card p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[16px] font-medium text-cream">
                                {pass.attendeeName}
                              </p>
                              <span className="do-pill">{pass.code}</span>
                              <span className="do-pill">
                                {pass.checkedInAt ? "Checked in" : "Waiting"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {pass.attendeeEmail ? (
                                <span className="do-pill">{pass.attendeeEmail}</span>
                              ) : null}
                              <span className="do-pill">
                                Issued by {pass.issuedByName}
                              </span>
                              <span className="do-pill">
                                <Clock3Icon className="size-3.5" />
                                {formatTimestamp(pass.createdAt)}
                              </span>
                            </div>

                            {pass.note ? (
                              <p className="text-[12px] leading-6 text-tan">{pass.note}</p>
                            ) : null}

                            {pass.checkedInAt ? (
                              <p className="text-[12px] leading-6 text-tan">
                                Checked in by {pass.checkedInByName ?? "campus staff"} on{" "}
                                {formatTimestamp(pass.checkedInAt)}
                              </p>
                            ) : null}
                          </div>

                          {data.canManage ? (
                            pass.checkedInAt ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isUpdatingPass && pendingPassId === pass.id}
                                onClick={() =>
                                  handleResetPass(pass.id, pass.attendeeName)
                                }
                              >
                                <RefreshCcwIcon className="size-4" />
                                Reset
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={isUpdatingPass && pendingPassId === pass.id}
                                onClick={() =>
                                  handleCheckInFromList(
                                    pass.id,
                                    pass.code,
                                    pass.attendeeName
                                  )
                                }
                              >
                                <CheckCircle2Icon className="size-4" />
                                Check in
                              </Button>
                            )
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                    {data.gatePasses.length
                      ? "No gate passes matched that search."
                      : "No passes issued yet. Create the first attendee pass to start the desk."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="do-panel p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="do-eyebrow">Live Polls</p>
                <h3 className="mt-2 do-subheading">Create decisions and watch turnout move</h3>
              </div>
              {!data.canManage ? <span className="do-pill">Admins publish polls</span> : null}
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
              <div className="do-card p-4">
                <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                  <VoteIcon className="size-4 text-sage" />
                  Publish poll
                </div>

                <form onSubmit={handleCreatePoll} className="mt-4 space-y-3">
                  <Input
                    value={pollQuestion}
                    onChange={(event) => setPollQuestion(event.target.value)}
                    placeholder="What should we decide?"
                    disabled={!data.canManage || isCreatingPoll}
                  />
                  <textarea
                    value={pollDescription}
                    onChange={(event) => setPollDescription(event.target.value)}
                    placeholder="Optional context for voters"
                    className={textareaClassName}
                    disabled={!data.canManage || isCreatingPoll}
                  />
                  <textarea
                    value={pollOptions}
                    onChange={(event) => setPollOptions(event.target.value)}
                    placeholder={"Option one\nOption two\nOption three"}
                    className={textareaClassName}
                    disabled={!data.canManage || isCreatingPoll}
                  />
                  <p className="text-[11px] leading-5 text-tan">
                    Add one option per line. Members can change their vote while the
                    poll stays open.
                  </p>
                  <Button
                    type="submit"
                    disabled={
                      !data.canManage ||
                      isCreatingPoll ||
                      !pollQuestion.trim() ||
                      !pollOptions.trim()
                    }
                  >
                    <PlusIcon className="size-4" />
                    Publish poll
                  </Button>
                </form>
              </div>

              {data.polls.length ? (
                <div className="space-y-4 xl:max-h-[760px] xl:overflow-y-auto xl:pr-1">
                  {data.polls.map((poll) => (
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

                        {data.canManage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUpdatingPoll && pendingPollId === poll.id}
                            onClick={() =>
                              handlePollStatus(
                                poll.id,
                                poll.status === "open" ? "closed" : "open"
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
                                    (isUpdatingPoll && pendingPollId === poll.id)
                                  }
                                  onClick={() => handleVote(poll.id, option.id)}
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
                          {formatTimestamp(poll.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  No polls yet. Publish the first campus decision from the form on the
                  left and results will appear live here.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="do-panel p-5">
            <p className="do-eyebrow">Active Right Now</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Live campus ops presence
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              Keep an eye on who is currently working around the workspace while the
              desk and polls are in motion.
            </p>

            <div className="mt-5 space-y-3">
              {data.activeMembers.length ? (
                data.activeMembers.map((entry) => (
                  <div key={`${entry.name}-${entry.lastSeenAt}`} className="do-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-medium text-cream">{entry.name}</p>
                        <p className="mt-1 text-[12px] leading-6 text-tan">
                          {entry.routeLabel}
                        </p>
                      </div>
                      <PresenceDot status="online" className="size-2.5" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  Live presence will appear here as soon as people open the campus.
                </div>
              )}
            </div>
          </section>

          <section className="do-panel p-5">
            <p className="do-eyebrow">How It Works</p>
            <div className="mt-4 space-y-3">
              <div className="do-card p-4">
                <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                  <QrCodeIcon className="size-4 text-terracotta" />
                  Gate passes stay durable
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Every issued pass stays on the page with a reusable code and a visible
                  check-in state.
                </p>
              </div>
              <div className="do-card p-4">
                <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                  <ScanLineIcon className="size-4 text-slate" />
                  Desk actions are instant
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Organizers can check in from the console or the attendee list without
                  leaving the route.
                </p>
              </div>
              <div className="do-card p-4">
                <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                  <VoteIcon className="size-4 text-sage" />
                  Polls stay live
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Members can vote while a poll is open, admins can close it when the
                  decision is done, and results stay visible afterward.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
