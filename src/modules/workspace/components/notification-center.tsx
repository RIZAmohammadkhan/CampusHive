"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import {
  AtSignIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  MessageCircleIcon,
  SparklesIcon,
} from "lucide-react"

import { workspacePath } from "@/lib/workspaces"
import {
  notificationsApi,
  type NotificationData,
} from "@/modules/notifications/api"

type NotificationItem = NotificationData["items"][number]

function notificationIcon(kind: NotificationItem["kind"]) {
  if (kind === "dm") {
    return <MessageCircleIcon className="size-4" />
  }

  if (kind === "mention") {
    return <AtSignIcon className="size-4" />
  }

  if (kind === "workspaceEvent" || kind === "clubEvent") {
    return <CalendarDaysIcon className="size-4" />
  }

  if (kind === "taskAssigned" || kind === "taskVolunteer") {
    return <CheckSquareIcon className="size-4" />
  }

  return <SparklesIcon className="size-4" />
}

function notificationLabel(kind: NotificationItem["kind"]) {
  if (kind === "dm") return "Message"
  if (kind === "mention") return "Mention"
  if (kind === "workspaceEvent" || kind === "clubEvent") return "Event"
  if (kind === "taskAssigned" || kind === "taskVolunteer") return "Task"
  return "Update"
}

function formatRelativeTime(timestamp: number) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (minutes < 60) {
    return `${minutes}m`
  }

  if (minutes < 1_440) {
    return `${Math.round(minutes / 60)}h`
  }

  return `${Math.round(minutes / 1_440)}d`
}

export function NotificationCenter({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const notifications = useQuery(notificationsApi.list, { workspaceSlug })
  const markAllRead = useMutation(notificationsApi.markAllRead)

  useEffect(() => {
    if (!open || !notifications?.unreadCount) {
      return
    }

    void markAllRead({ workspaceSlug })
  }, [open, notifications?.unreadCount, markAllRead, workspaceSlug])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[8px] border border-hairline bg-elevated/92 text-tan transition-colors hover:border-white/10 hover:bg-[rgba(255,255,255,0.04)] hover:text-parchment"
        aria-label="Toggle notifications"
        aria-expanded={open}
      >
        <BellIcon className="size-4" />
        {notifications && notifications.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border border-[rgba(201,132,122,0.2)] bg-[rgba(201,132,122,0.16)] px-1.5 py-0.5 text-[10px] font-medium text-rose">
            {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-3 w-[min(360px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-[10px] border border-hairline bg-elevated/96 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:content-[''] sm:w-[360px] sm:max-w-none sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="do-eyebrow">Notifications</p>
              <h3 className="mt-2 text-[20px] font-semibold text-parchment">
                Updates
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-tan transition-colors hover:text-parchment"
            >
              Close
            </button>
          </div>

          <div className="mt-4 max-h-[min(65dvh,420px)] space-y-2 overflow-y-auto sm:pr-1">
            {notifications?.items.length ? (
              notifications.items.map((item) => (
                <Link
                  key={item.id}
                  href={workspacePath(workspaceSlug, item.route)}
                  onClick={() => setOpen(false)}
                  className="block rounded-[10px] border border-hairline bg-surface/78 px-4 py-3 transition-all hover:-translate-y-px hover:border-white/10 hover:bg-elevated"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-hairline bg-panel/90 text-tan">
                      {notificationIcon(item.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="do-pill do-pill-platinum">
                              {notificationLabel(item.kind)}
                            </span>
                            {!item.readAt ? (
                              <span className="size-2 rounded-full bg-rose" />
                            ) : null}
                          </div>
                          <p className="mt-2 truncate text-[14px] font-medium text-parchment">
                            {item.title}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-tan">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-6 text-tan">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[10px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
