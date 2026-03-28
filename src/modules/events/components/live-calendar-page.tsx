"use client"

import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import {
  CalendarDaysIcon,
  Clock3Icon,
  MapPinIcon,
  MonitorIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { eventsApi } from "@/modules/events/api"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

const eventTypes = [
  "Club meeting",
  "Workshop",
  "Hack night",
  "Orientation",
  "Showcase",
  "Volunteer shift",
] as const

const selectClassName =
  "h-10 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-3 text-[13px] text-parchment outline-none transition-[border-color,box-shadow] focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"

function EventComposerModal({
  open,
  canManage,
  title,
  setTitle,
  type,
  setType,
  date,
  setDate,
  time,
  setTime,
  location,
  setLocation,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean
  canManage: boolean
  title: string
  setTitle: (value: string) => void
  type: (typeof eventTypes)[number]
  setType: (value: (typeof eventTypes)[number]) => void
  date: string
  setDate: (value: string) => void
  time: string
  setTime: (value: string) => void
  location: string
  setLocation: (value: string) => void
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
            <h3 className="mt-2 do-subheading">Publish to the shared calendar</h3>
            <p className="mt-3 max-w-xl text-[13px] leading-6 text-tan">
              Add the essentials students need to show up on time: what it is, when
              it happens, and where they should go.
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
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
          <select
            value={type}
            onChange={(event) => setType(event.target.value as (typeof eventTypes)[number])}
            className={selectClassName}
            disabled={isPending}
          >
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
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
            placeholder="Auditorium A or meeting link"
            disabled={isPending}
          />
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-[12px] leading-6 text-tan">
              Campus events currently support title, type, date, time, and location.
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
                  !date.trim() ||
                  !time.trim() ||
                  !location.trim()
                }
              >
                <PlusIcon className="size-4" />
                {isPending ? "Publishing..." : "Publish event"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function LiveCalendarPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Events need Convex."
        body="Add your deployment URL and run Convex to load the calendar."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveCalendarPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveCalendarPageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const data = useQuery(eventsApi.schedule, { workspaceSlug })
  const createEvent = useMutation(eventsApi.createEvent)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState<(typeof eventTypes)[number]>("Club meeting")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")
  const [isPending, startTransition] = useTransition()

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading events"
        body="Syncing the calendar."
      />
    )
  }

  const nextEvent = data.days.flatMap((day) => day.items).at(0) ?? null

  const resetComposer = () => {
    setTitle("")
    setType("Club meeting")
    setDate("")
    setTime("")
    setLocation("")
  }

  const closeComposer = () => {
    if (isPending) {
      return
    }

    setIsComposerOpen(false)
  }

  const handleCreateEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        await createEvent({
          workspaceSlug,
          title,
          type,
          date,
          time,
          location,
        })

        resetComposer()
        setIsComposerOpen(false)
        toast.success("Event added to the shared calendar")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create event.")
      }
    })
  }

  return (
    <>
      <EventComposerModal
        open={isComposerOpen}
        canManage={data.canManage}
        title={title}
        setTitle={setTitle}
        type={type}
        setType={setType}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        location={location}
        setLocation={setLocation}
        isPending={isPending}
        onClose={closeComposer}
        onSubmit={handleCreateEvent}
      />

      <div className="space-y-6 lg:space-y-8">
        <section className="do-surface overflow-hidden p-6">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <div>
              <p className="do-eyebrow">Calendar</p>
              <h2 className="mt-2 do-subheading">Shared campus schedule.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-tan">
                A calmer view of what is happening across campus, with the next event
                always in focus and the full schedule grouped by day.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="do-pill">
                  <CalendarDaysIcon className="size-3.5" />
                  {data.summary[0]?.value ?? "00"} upcoming
                </span>
                <span className="do-pill">
                  <SparklesIcon className="size-3.5" />
                  {data.canManage ? "You can publish events" : "Read-only access"}
                </span>
              </div>
            </div>

            <div className="do-card p-5">
              <p className="do-eyebrow">Next up</p>
              {nextEvent ? (
                <>
                  <h3 className="mt-3 text-[20px] font-medium text-cream">
                    {nextEvent.title}
                  </h3>
                  <div className="mt-4 space-y-2 text-[13px] leading-6 text-tan">
                    <div className="flex items-center gap-2">
                      <Clock3Icon className="size-4 text-terracotta" />
                      <span>{nextEvent.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="size-4 text-terracotta" />
                      <span>{nextEvent.location}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-[13px] leading-6 text-tan">
                  No events are scheduled yet.
                </p>
              )}

              {data.canManage ? (
                <Button className="mt-5 w-full" onClick={() => setIsComposerOpen(true)}>
                  <PlusIcon className="size-4" />
                  Add event
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {data.summary.map((metric) => (
            <div key={metric.label} className="do-card p-5">
              <p className="do-stat-label">{metric.label}</p>
              <p className="mt-4 do-stat-value">{metric.value}</p>
              <p className="mt-3 text-[12px] leading-6 text-tan">{metric.detail}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="do-eyebrow">Schedule</p>
              <h3 className="mt-2 do-subheading">Upcoming by day</h3>
            </div>
            {!data.canManage ? (
              <span className="do-pill">Only campus admins can add events</span>
            ) : null}
          </div>

          {data.days.length ? (
            <div className="space-y-4">
              {data.days.map((day) => (
                <div key={day.dayKey} className="do-panel overflow-hidden p-0">
                  <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                    <div className="border-b border-hairline bg-surface/55 p-5 lg:border-r lg:border-b-0">
                      <p className="do-eyebrow">{day.dayName}</p>
                      <h4 className="mt-2 text-[24px] font-medium text-cream">
                        {day.dateLabel}
                      </h4>
                      <p className="mt-3 text-[12px] leading-6 text-tan">
                        {day.items.length} scheduled {day.items.length === 1 ? "event" : "events"}
                      </p>
                    </div>

                    <div className="divide-y divide-hairline">
                      {day.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[18px] font-medium text-cream">
                                {item.title}
                              </p>
                              <span className="do-pill">{item.type}</span>
                              {item.isVirtual ? (
                                <span className="do-pill">
                                  <MonitorIcon className="size-3.5" />
                                  Virtual
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="do-pill">
                                <Clock3Icon className="size-3.5" />
                                {item.time}
                              </span>
                              <span className="do-pill">
                                <MapPinIcon className="size-3.5" />
                                {item.location}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="do-panel p-6 text-[13px] text-tan">
              No events scheduled yet.
            </div>
          )}
        </section>
      </div>
    </>
  )
}
