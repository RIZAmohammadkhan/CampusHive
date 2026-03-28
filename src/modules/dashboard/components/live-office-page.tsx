"use client"

import Link from "next/link"
import { ArrowRightIcon, FolderKanbanIcon, MessageSquareTextIcon } from "lucide-react"
import { useQuery } from "convex/react"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"
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

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="do-eyebrow">Overview</p>
            <h2 className="mt-2 do-subheading">Everything important, at a glance.</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={workspacePath(workspaceSlug, "/channels")}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Clubs
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href={workspacePath(workspaceSlug, "/projects")}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Tasks
              <FolderKanbanIcon className="size-4" />
            </Link>
            <Link
              href={workspacePath(workspaceSlug, "/calendar")}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Events
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <div key={metric.label} className="do-card p-5">
            <p className="do-stat-label">{metric.label}</p>
            <p className="mt-4 do-stat-value">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="do-eyebrow">Clubs</p>
              <h3 className="mt-2 do-subheading">Active spaces</h3>
            </div>
            <span className="do-pill">
              <MessageSquareTextIcon className="size-3.5" />
              Live activity
            </span>
          </div>

          {data.channels.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                  className="do-card block p-5 transition-colors duration-200 hover:border-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-medium text-cream">{channel.name}</p>
                      <p className="mt-1 text-[11px] tracking-[0.12em] text-tan uppercase">
                        {channel.category}
                      </p>
                      <p className="mt-2 text-[13px] text-tan line-clamp-2">
                        {channel.description}
                      </p>
                    </div>
                    <span className="do-pill shrink-0">{channel.messageCount}</span>
                  </div>
                  <p className="mt-5 text-[11px] tracking-[0.12em] text-tan uppercase">
                    Open #{channel.slug} · Activity {formatActivity(channel.lastMessageAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="do-panel flex min-h-[120px] items-center justify-center p-6 text-center text-[13px] text-tan">
              No active club spaces yet.
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <section className="do-panel p-5">
            <p className="do-eyebrow">People</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">Live now</h3>
            <div className="mt-5 space-y-3">
              {data.activeMembers.length ? (
                data.activeMembers.map((member) => (
                  <div key={member.id} className="do-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-cream truncate">
                          {member.name}
                        </p>
                        <p className="mt-1 text-[12px] leading-6 text-tan truncate">
                          {member.role === "admin" ? "College admin" : "Student member"}
                          {member.routeLabel ? ` · ${member.routeLabel}` : ""}
                        </p>
                      </div>
                      <PresenceDot
                        status={member.isActive ? "online" : "offline"}
                        className="size-2.5"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-center text-[13px] text-tan">
                  It&apos;s quiet right now.
                </div>
              )}
            </div>
          </section>

          <section className="do-panel p-5">
            <p className="do-eyebrow">Tasks</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">Recent activity</h3>
            <div className="mt-5 space-y-3">
              {data.recentTasks.length ? (
                data.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-hairline bg-surface/55 p-4"
                  >
                    <p className="text-[14px] font-medium text-cream truncate">{task.title}</p>
                    <p className="mt-2 text-[12px] leading-6 text-tan truncate">
                      {task.assigneeName ? `Owned by ${task.assigneeName}` : "Unassigned"}
                      {" · "}
                      {task.priority}
                      {" · "}
                      {formatTaskLane(task.column)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-center text-[13px] text-tan">
                  No pending event tasks.
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
