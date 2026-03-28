"use client"

import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import {
  Clock3Icon,
  MapPinIcon,
  MonitorIcon,
  PlusIcon,
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
  const upcomingCount =
    data.summary.find((metric) => metric.label.toLowerCase().includes("upcoming"))?.value ??
    data.days.flatMap((day) => day.items).length.toString()
  const summaryText = nextEvent
    ? `${upcomingCount} upcoming · Next ${nextEvent.title} · ${nextEvent.time}`
    : `${upcomingCount} upcoming`

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

      <section className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="do-eyebrow">Events</p>
              <h2 className="text-[28px] font-semibold tracking-tight text-cream">
                Calendar
              </h2>
              <p className="text-[13px] leading-6 text-tan">{summaryText}</p>
              <p className="text-[12px] leading-5 text-tan">
                {data.canManage
                  ? "Add events and keep the campus schedule current."
                  : "Read-only schedule."}
              </p>
            </div>

            {data.canManage ? (
              <Button onClick={() => setIsComposerOpen(true)}>
                <PlusIcon className="size-4" />
                Add event
              </Button>
            ) : null}
          </div>
        </div>

        {data.days.length ? (
          <div className="divide-y divide-hairline">
            {data.days.map((day) => (
              <div key={day.dayKey}>
                <div className="border-b border-hairline px-5 py-4 sm:px-6">
                  <p className="do-eyebrow">{day.dayName}</p>
                  <h3 className="mt-2 text-[18px] font-medium text-cream">
                    {day.dateLabel}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-tan">
                    {day.items.length} {day.items.length === 1 ? "event" : "events"}
                  </p>
                </div>

                <div className="divide-y divide-hairline">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-5 py-4 sm:px-6"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-medium text-cream">
                              {item.title}
                            </p>
                            <span className="text-[12px] text-tan">{item.type}</span>
                            {item.isVirtual ? (
                              <span className="text-[12px] text-tan">Virtual</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-tan">
                            {item.time}
                            {" · "}
                            {item.location}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 text-[12px] text-tan">
                          <span className="inline-flex items-center gap-1">
                            <Clock3Icon className="size-3.5" />
                            {item.time}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {item.isVirtual ? (
                              <MonitorIcon className="size-3.5" />
                            ) : (
                              <MapPinIcon className="size-3.5" />
                            )}
                            {item.isVirtual ? "Online" : "On site"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
            No events scheduled yet.
          </div>
        )}
      </section>
    </>
  )
}
