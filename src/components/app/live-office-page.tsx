"use client"

import Link from "next/link"
import { ArrowRightIcon, FolderKanbanIcon, MessageSquareTextIcon } from "lucide-react"
import { useQuery } from "convex/react"

import { PresenceDot } from "@/components/app/presence-dot"
import { LiveLoadingState } from "@/components/app/live-loading-state"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { buttonVariants } from "@/components/ui/button-variants"
import { convexApi } from "@/lib/convex-api"
import { cn } from "@/lib/utils"
import { workspacePath } from "@/lib/workspaces"

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
        title="The campus hub needs a live Convex deployment."
        body="Presence, club spaces, and event operations now come from Convex. Add your deployment URL and run the Convex dev process to make the campus fully interactive."
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
  const data = useQuery(convexApi.dashboard.office, { workspaceSlug })

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading campus hub"
        body="Convex is syncing students, club spaces, and event task visibility for this campus."
      />
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="do-eyebrow">CampusHive Hub</p>
              <h2 className="do-heading max-w-3xl">
                One place to see the clubs, activity, and event work shaping campus life.
              </h2>
              <p className="max-w-2xl do-copy">
                CampusHive turns the current Clerk organization into a digital campus:
                club spaces stay organized, event tasks stay assigned, and live
                activity stays visible without hunting through scattered threads.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={workspacePath(workspaceSlug, "/channels")}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Explore clubs
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href={workspacePath(workspaceSlug, "/projects")}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Open event ops
                <FolderKanbanIcon className="size-4" />
              </Link>
              <Link
                href={workspacePath(workspaceSlug, "/calendar")}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                See events
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>

          <div className="do-panel p-5">
            <p className="do-eyebrow">Current Access Model</p>
            <h3 className="mt-2 text-[22px] font-medium text-cream">
              {data.currentRole === "admin"
                ? "You can shape this campus, create club spaces, and manage event operations."
                : "You can move through club spaces, follow events, and update shared work."}
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              Admin-only actions are enforced in Convex as well as the UI, so campus
              structure and assignment controls do not rely on page guards alone.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <div key={metric.label} className="do-card p-5">
            <p className="do-stat-label">{metric.label}</p>
            <p className="mt-4 do-stat-value">{metric.value}</p>
            <p className="mt-2 text-[12px] leading-6 text-tan">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="do-eyebrow">Community Discovery</p>
              <h3 className="mt-2 do-subheading">Club spaces students can actually find</h3>
            </div>
            <span className="do-pill">
              <MessageSquareTextIcon className="size-3.5" />
              Live campus data
            </span>
          </div>

          {data.channels.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={workspacePath(workspaceSlug, `/channels/${channel.slug}`)}
                  className="do-card block p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-medium text-cream">{channel.name}</p>
                      <p className="mt-2 text-[13px] leading-6 text-tan">
                        {channel.description}
                      </p>
                    </div>
                    <span className="do-pill">{channel.messageCount}</span>
                  </div>
                  <p className="mt-5 text-[11px] tracking-[0.12em] text-tan uppercase">
                    Open #{channel.slug} · Last activity {formatActivity(channel.lastMessageAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="do-panel p-5 text-[13px] leading-6 text-tan">
              No club spaces are available yet. Institute admins can create the
              first one from the Clubs page.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="do-panel p-5">
            <p className="do-eyebrow">People Active Now</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Current campus presence
            </h3>
            <div className="mt-5 space-y-3">
              {data.activeMembers.length ? (
                data.activeMembers.map((member) => (
                  <div key={member.id} className="do-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-medium text-cream">
                          {member.name}
                        </p>
                        <p className="mt-1 text-[12px] leading-6 text-tan">
                          {member.role === "admin" ? "Institute admin" : "Student member"}
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
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  Presence will appear here as soon as students open the campus.
                </div>
              )}
            </div>
          </section>

          <section className="do-panel p-5">
            <p className="do-eyebrow">Event Task Pulse</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Recent operations updates
            </h3>
            <div className="mt-5 space-y-3">
              {data.recentTasks.length ? (
                data.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-hairline bg-surface/55 p-4"
                  >
                    <p className="text-[14px] font-medium text-cream">{task.title}</p>
                    <p className="mt-2 text-[12px] leading-6 text-tan">
                      {task.assigneeName ? `Owned by ${task.assigneeName}` : "Unassigned"}
                      {" · "}
                      {task.priority}
                      {" · "}
                      {formatTaskLane(task.column)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  No event tasks exist yet. Institute admins can create the first
                  one from the Event Ops page.
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="do-card p-5">
          <p className="do-stat-label">Entry Flow</p>
          <p className="mt-4 text-[18px] font-medium text-cream">
            QR gate passes fit next to events, not in a separate tool.
          </p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            The control room route is already laid out for pass issuance and scan
            desks once those flows are wired.
          </p>
        </div>
        <div className="do-card p-5">
          <p className="do-stat-label">Decisions</p>
          <p className="mt-4 text-[18px] font-medium text-cream">
            Polls belong inside communities instead of one-off forms.
          </p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Clubs, resources, and roles now provide the structure future voting
            features can plug into.
          </p>
        </div>
        <div className="do-card p-5">
          <p className="do-stat-label">Notifications</p>
          <p className="mt-4 text-[18px] font-medium text-cream">
            Quiet alerts work better when campus context is unified.
          </p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Presence, event tasks, and club spaces now live in one operating layer
            instead of fragmented channels.
          </p>
        </div>
      </section>
    </div>
  )
}
