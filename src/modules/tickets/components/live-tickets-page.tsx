"use client"

import Link from "next/link"
import { useQuery } from "convex/react"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { cn } from "@/lib/utils"
import { workspaceClubPath } from "@/lib/workspaces"
import { TicketQr } from "@/modules/channels/components/ticket-qr"
import { formatEventDate, formatShortDate } from "@/modules/channels/components/conversation-utils"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"
import { ticketsApi } from "@/modules/tickets/api"

function statusLabel(ticket: {
  status: "pending" | "approved" | "rejected"
  checkedInAt: number | null
}) {
  if (ticket.checkedInAt) {
    return "Checked in"
  }

  if (ticket.status === "pending") {
    return "Pending approval"
  }

  if (ticket.status === "rejected") {
    return "Rejected"
  }

  return "Approved"
}

function statusClassName(ticket: {
  status: "pending" | "approved" | "rejected"
  checkedInAt: number | null
}) {
  if (ticket.checkedInAt) {
    return "border-[rgba(117,192,143,0.22)] bg-[rgba(117,192,143,0.12)] text-sage"
  }

  if (ticket.status === "pending") {
    return "border-[rgba(200,169,110,0.2)] bg-[rgba(200,169,110,0.12)] text-gold"
  }

  if (ticket.status === "rejected") {
    return "border-[rgba(201,132,122,0.2)] bg-[rgba(201,132,122,0.12)] text-rose"
  }

  return "border-hairline bg-surface/55 text-parchment"
}

export function LiveTicketsPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Tickets need Convex."
        body="Add your deployment URL and run Convex to load saved ticket passes."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveTicketsPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveTicketsPageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const data = useQuery(ticketsApi.viewerTickets, { workspaceSlug })

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading tickets"
        body="Syncing your ticket requests and approved passes."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <p className="do-eyebrow">Tickets</p>
          <h2 className="mt-2 text-[24px] font-medium text-cream">Saved passes</h2>
          <p className="mt-2 text-[13px] leading-6 text-tan">
            Approved tickets live here, alongside pending and rejected event requests.
          </p>
        </div>
        <div className="grid gap-3 px-5 py-5 sm:px-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
            <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Approved</p>
            <p className="mt-2 text-[20px] font-medium text-cream">{data.summary.approved}</p>
          </div>
          <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
            <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Pending</p>
            <p className="mt-2 text-[20px] font-medium text-cream">{data.summary.pending}</p>
          </div>
          <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
            <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Rejected</p>
            <p className="mt-2 text-[20px] font-medium text-cream">{data.summary.rejected}</p>
          </div>
          <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
            <p className="text-[11px] tracking-[0.12em] text-tan uppercase">Checked in</p>
            <p className="mt-2 text-[20px] font-medium text-cream">{data.summary.checkedIn}</p>
          </div>
        </div>
      </section>

      {data.tickets.length ? (
        <div className="space-y-4">
          {data.tickets.map((ticket) => (
            <section key={ticket.id} className="do-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[18px] font-medium text-cream">{ticket.eventTitle}</h3>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        statusClassName(ticket)
                      )}
                    >
                      {statusLabel(ticket)}
                    </span>
                    {ticket.code ? <span className="do-pill">{ticket.code}</span> : null}
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-tan">
                    <Link
                      href={workspaceClubPath(workspaceSlug, ticket.clubSlug)}
                      className="text-parchment hover:text-cream"
                    >
                      {ticket.clubName}
                    </Link>
                    {" · "}
                    {formatEventDate(ticket.eventDate)}
                    {" · "}
                    {ticket.eventTime}
                    {" · "}
                    {ticket.eventLocation}
                  </p>
                  <p className="mt-1 text-[12px] leading-6 text-tan">
                    Requested {formatShortDate(ticket.createdAt)}
                    {ticket.approvedAt ? ` · Approved ${formatShortDate(ticket.approvedAt)}` : ""}
                  </p>
                </div>
              </div>

              {ticket.qrValue ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
                    <p className="text-[12px] font-medium text-parchment">Entry pass</p>
                    <p className="mt-2 text-[13px] leading-6 text-tan">
                      Present this QR at the venue for verification. The pass stays valid
                      until staff checks you in.
                    </p>
                  </div>
                  <TicketQr
                    value={ticket.qrValue}
                    alt={`${ticket.eventTitle} ticket QR`}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-[18px] border border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                  {ticket.status === "pending"
                    ? "Your request is waiting for admin approval."
                    : "This request was declined. You can register again from the event page if space opens up."}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-hairline bg-surface/55 p-6 text-[13px] leading-6 text-tan">
          No ticket requests yet. Register from a club event and it will appear here.
        </div>
      )}
    </div>
  )
}
