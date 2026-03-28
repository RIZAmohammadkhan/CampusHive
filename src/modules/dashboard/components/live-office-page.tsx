"use client"

import Link from "next/link"
import { useQuery } from "convex/react"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import {
  workspaceClubPath,
  workspacePersonPath,
} from "@/lib/workspaces"
import { dashboardApi } from "@/modules/dashboard/api"
import { PresenceDot } from "@/modules/presence/components/presence-dot"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

function formatActivity(timestamp: number | null) {
  if (!timestamp) {
    return "No activity yet"
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  return `${diffHours} hr ago`
}

function formatTaskLane(column: "now" | "next" | "later") {
  if (column === "now") return "Ready now"
  if (column === "next") return "In motion"
  return "Follow-up"
}

export function LiveOfficePage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="The campus hub needs Convex."
        body="Add your deployment URL and run Convex to load live data."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveOfficePageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveOfficePageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const data = useQuery(dashboardApi.office, { workspaceSlug })

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading campus"
        body="Syncing live activity."
      />
    )
  }

  const summary = [
    `${data.activeMembers.length} active`,
    `${data.channels.length} clubs`,
    `${data.recentTasks.length} tasks`,
  ].join(" · ")

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="do-eyebrow">Clubs</p>
              <h2 className="mt-2 text-[20px] font-medium text-cream">Active spaces</h2>
            </div>
            <span className="text-[12px] text-tan">{summary}</span>
          </div>
        </div>

        {data.channels.length ? (
          <div className="divide-y divide-hairline">
            {data.channels.slice(0, 6).map((channel) => (
              <Link
                key={channel.id}
                href={workspaceClubPath(workspaceSlug, channel.slug)}
                className="block px-5 py-4 transition-colors hover:bg-active-row/70 sm:px-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-cream">
                      {channel.name}
                    </p>
                    <p className="mt-1 truncate text-[12px] leading-5 text-tan">
                      {channel.category}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-tan">
                    {formatActivity(channel.lastMessageAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
            No active clubs yet.
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <section className="do-surface overflow-hidden">
          <div className="border-b border-hairline px-5 py-5 sm:px-6">
            <p className="do-eyebrow">People</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">Live now</h3>
          </div>

          {data.activeMembers.length ? (
            <div className="divide-y divide-hairline">
              {data.activeMembers.slice(0, 6).map((member) => (
                <Link
                  key={member.id}
                  href={workspacePersonPath(workspaceSlug, member.id)}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-active-row/70 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-cream">
                      {member.name}
                    </p>
                    <p className="mt-1 truncate text-[12px] leading-5 text-tan">
                      {member.routeLabel ??
                        (member.role === "admin" ? "College admin" : "Student")}
                    </p>
                  </div>
                  <PresenceDot
                    status={member.isActive ? "online" : "offline"}
                    className="size-2.5"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
              It&apos;s quiet right now.
            </div>
          )}
        </section>

        <section className="do-surface overflow-hidden">
          <div className="border-b border-hairline px-5 py-5 sm:px-6">
            <p className="do-eyebrow">Tasks</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">Next up</h3>
          </div>

          {data.recentTasks.length ? (
            <div className="divide-y divide-hairline">
              {data.recentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="px-5 py-4 sm:px-6">
                  <p className="truncate text-[14px] font-medium text-cream">
                    {task.title}
                  </p>
                  <p className="mt-1 truncate text-[12px] leading-5 text-tan">
                    {task.assigneeName ? task.assigneeName : "Unassigned"}
                    {" · "}
                    {task.priority}
                    {" · "}
                    {formatTaskLane(task.column)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-[13px] leading-6 text-tan sm:px-6">
              No open tasks right now.
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
