"use client"

import { useState, useTransition } from "react"
import { CalendarDaysIcon, MapPinIcon, MonitorIcon, PlusIcon } from "lucide-react"
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
  "h-10 rounded-2xl border border-hairline bg-field/90 px-3 text-[13px] text-parchment outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"

export function LiveCalendarPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Campus events need a live Convex deployment."
        body="Shared scheduling, event creation, and grouped calendar views now come from Convex so campus planning stays durable and collaborative."
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
  const [title, setTitle] = useState("")
  const [type, setType] = useState<(typeof eventTypes)[number]>("Club meeting")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")
  const [isPending, startTransition] = useTransition()

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading campus events"
        body="Convex is syncing shared calendar days, upcoming meetings, and event creation controls."
      />
    )
  }

  const handleCreateEvent = (event: React.FormEvent<HTMLFormElement>) => {
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

        setTitle("")
        setType("Club meeting")
        setDate("")
        setTime("")
        setLocation("")
        toast.success("Event added to the shared calendar")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create event.")
      }
    })
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="do-eyebrow">Events & Meetings</p>
            <h2 className="do-heading max-w-3xl">
              Put every club meeting and campus moment on one shared calendar.
            </h2>
            <p className="max-w-2xl do-copy">
              This gives CampusHive a real event layer: organizers can add sessions,
              everyone can scan the week, and virtual-ready events stay visible.
            </p>
          </div>

          <div className="do-panel p-5">
            <p className="do-stat-label">Scheduling Notes</p>
            <p className="mt-3 text-[22px] font-medium text-cream">
              {data.canManage
                ? "Institute admins can publish new calendar entries from this page."
                : "You can follow the shared campus schedule in real time."}
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              Online and hybrid events can already be marked here. Automatic room
              generation can plug into this next without changing the route design.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.summary.map((metric) => (
          <div key={metric.label} className="do-card p-5">
            <p className="do-stat-label">{metric.label}</p>
            <p className="mt-4 do-stat-value">{metric.value}</p>
            <p className="mt-2 text-[12px] leading-6 text-tan">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="do-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="do-eyebrow">Create Event</p>
            <h3 className="mt-2 do-subheading">Add something to the campus calendar</h3>
          </div>
          {!data.canManage ? <span className="do-pill">Institute admins only</span> : null}
        </div>

        <form onSubmit={handleCreateEvent} className="mt-5 grid gap-3 lg:grid-cols-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Event title"
            disabled={!data.canManage || isPending}
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as (typeof eventTypes)[number])}
            className={selectClassName}
            disabled={!data.canManage || isPending}
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
            disabled={!data.canManage || isPending}
          />
          <Input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            placeholder="6:30 PM"
            disabled={!data.canManage || isPending}
          />
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Auditorium A or Zoom link"
            disabled={!data.canManage || isPending}
          />
          <div className="lg:col-span-2">
            <Button
              type="submit"
              disabled={
                !data.canManage ||
                isPending ||
                !title.trim() ||
                !date.trim() ||
                !time.trim() ||
                !location.trim()
              }
            >
              <PlusIcon className="size-4" />
              Add to calendar
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <p className="do-eyebrow">Upcoming Schedule</p>
          <h3 className="mt-2 do-subheading">What the campus is gathering around next</h3>
        </div>

        {data.days.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.days.map((day) => (
              <div key={day.dayKey} className="do-panel p-5">
                <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
                  <div>
                    <p className="do-eyebrow">{day.dayName}</p>
                    <h4 className="mt-2 text-[22px] font-medium text-cream">
                      {day.dateLabel}
                    </h4>
                  </div>
                  <span className="do-pill">
                    <CalendarDaysIcon className="size-3.5" />
                    {day.items.length} events
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {day.items.map((item) => (
                    <div key={item.id} className="do-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[16px] font-medium text-cream">{item.title}</p>
                          <p className="mt-2 text-[12px] leading-6 text-tan">
                            {item.type}
                          </p>
                        </div>
                        <span className="do-pill">{item.time}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="do-pill">
                          <MapPinIcon className="size-3.5" />
                          {item.location}
                        </span>
                        {item.isVirtual ? (
                          <span className="do-pill">
                            <MonitorIcon className="size-3.5" />
                            Virtual-ready
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="do-panel p-6 text-[13px] leading-6 text-tan">
            No events are scheduled yet. Add the first meeting, workshop, or club
            session above to turn this into a real shared campus calendar.
          </div>
        )}
      </section>
    </div>
  )
}
