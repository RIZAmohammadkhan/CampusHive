"use client"

import { BellIcon, QrCodeIcon, ScanLineIcon, VoteIcon } from "lucide-react"
import { useQuery } from "convex/react"

import { LiveLoadingState } from "@/components/app/live-loading-state"
import { PresenceDot } from "@/components/app/presence-dot"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { convexApi } from "@/lib/convex-api"

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
        body="Presence, member awareness, and operational visibility come from Convex, so this control room works best when the live backend is available."
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
  const presence = useQuery(convexApi.presence.listActive, { workspaceSlug })
  const directory = useQuery(convexApi.workspaces.directory, { workspaceSlug })
  const office = useQuery(convexApi.dashboard.office, { workspaceSlug })

  if (presence === undefined || directory === undefined || office === undefined) {
    return (
      <LiveLoadingState
        title="Loading control room"
        body="Convex is syncing live presence, campus members, and operational signals for passes and decisions."
      />
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="do-eyebrow">Gate Passes & Polls</p>
            <h2 className="do-heading max-w-3xl">
              Build the calm control room behind entry lines, live decisions, and quiet notifications.
            </h2>
            <p className="max-w-2xl do-copy">
              This route is the operational shell for QR passes, scan desks, and
              community votes. The live campus signals are already here, and the
              module slots are designed around them.
            </p>
          </div>

          <div className="do-panel p-5">
            <p className="do-stat-label">What&apos;s Live Today</p>
            <p className="mt-3 text-[22px] font-medium text-cream">
              {presence.length} active students, {directory?.members.length ?? 0} synced
              members, and {office?.channels.length ?? 0} club spaces already visible.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              That live awareness is what future gate scans, reminder nudges, and
              vote turnout updates will build on top of.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="do-card p-5">
          <p className="do-stat-label">Passes</p>
          <p className="mt-4 do-stat-value">{String(office?.metrics[3]?.value ?? "00")}</p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Event operations cards already live. Pass issuance can plug into the same flows next.
          </p>
        </div>
        <div className="do-card p-5">
          <p className="do-stat-label">Notifications</p>
          <p className="mt-4 do-stat-value">{String(presence.length).padStart(2, "0")}</p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Quiet nudges become more useful once the live campus graph is already in place.
          </p>
        </div>
        <div className="do-card p-5">
          <p className="do-stat-label">Votes</p>
          <p className="mt-4 do-stat-value">{String(office?.channels.length ?? 0).padStart(2, "0")}</p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Club spaces give future decision flows clear homes instead of one-off forms.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="do-panel p-5">
            <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
              <QrCodeIcon className="size-4 text-terracotta" />
              QR gate passes
            </div>
            <p className="mt-3 text-[18px] font-medium text-cream">
              Individual attendee passes and scan desk flows
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              The next layer for this route is pass generation, gate scanning, and
              instant entry confirmation for event staff.
            </p>
          </div>

          <div className="do-panel p-5">
            <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
              <ScanLineIcon className="size-4 text-slate" />
              Check-in console
            </div>
            <p className="mt-3 text-[18px] font-medium text-cream">
              A focused scanning surface for organizers at the door
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              This will sit beside the event schedule and task board so check-in
              never becomes a separate spreadsheet workflow.
            </p>
          </div>

          <div className="do-panel p-5">
            <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
              <VoteIcon className="size-4 text-sage" />
              Polls & decisions
            </div>
            <p className="mt-3 text-[18px] font-medium text-cream">
              Date votes, topic picks, and lead selections with live results
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              Club spaces and campus membership already provide the right scope for
              decision-making once vote persistence is wired in.
            </p>
          </div>

          <div className="do-panel p-5">
            <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
              <BellIcon className="size-4 text-cream" />
              Quiet notifications
            </div>
            <p className="mt-3 text-[18px] font-medium text-cream">
              Mentions, reminders, approvals, and ops escalations
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              The live presence and role model already support a calmer notification
              layer than scattered chat pings.
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="do-panel p-5">
            <p className="do-eyebrow">Active Right Now</p>
            <h3 className="mt-2 text-[20px] font-medium text-cream">
              Campus ops presence
            </h3>
            <div className="mt-5 space-y-3">
              {presence.length ? (
                presence.slice(0, 6).map((entry) => (
                  <div key={`${entry.name}-${entry.lastSeenAt}`} className="do-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-medium text-cream">
                          {entry.name}
                        </p>
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
        </aside>
      </section>
    </div>
  )
}
