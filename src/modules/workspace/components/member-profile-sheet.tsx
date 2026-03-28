"use client"

import { XIcon } from "lucide-react"
import { useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { workspaceApi } from "@/modules/workspace/api"

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

function formatTicketStatus(ticket: {
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

  return "Ticket issued"
}

export function MemberProfileSheet({
  workspaceSlug,
  userId,
  open,
  onClose,
}: {
  workspaceSlug: string
  userId: string | null
  open: boolean
  onClose: () => void
}) {
  const profile = useQuery(
    workspaceApi.memberProfile,
    open && userId ? { workspaceSlug, userId } : "skip"
  )

  if (!open || !userId) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/45 p-4 backdrop-blur-sm md:p-6"
      onClick={onClose}
    >
      <div
        className="do-surface max-h-[calc(100dvh-2rem)] w-full max-w-[420px] overflow-y-auto p-6 md:max-h-[calc(100dvh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="do-eyebrow">Member Profile</p>
            <h2 className="mt-2 do-subheading">
              {profile?.name ?? "Loading member..."}
            </h2>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        {profile ? (
          <div className="mt-5 space-y-4">
            <section className="do-card p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[18px] font-medium text-cream">
                  {profile.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="do-pill">{profile.workspaceName}</span>
                    <span className="do-pill">
                      {profile.workspaceRole === "admin"
                        ? "College admin"
                        : "Student member"}
                    </span>
                  </div>
                  <p className="text-[13px] leading-6 text-tan">
                    Joined campus on {formatDate(profile.joinedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                  <p className="do-eyebrow">First Name</p>
                  <p className="mt-2 text-[15px] font-medium text-cream">
                    {profile.firstName || "Not set"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                  <p className="do-eyebrow">Last Name</p>
                  <p className="mt-2 text-[15px] font-medium text-cream">
                    {profile.lastName || "Not set"}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-[20px] border border-hairline bg-surface/55 p-4">
                <p className="do-eyebrow">Email</p>
                <p className="mt-2 break-all text-[14px] font-medium text-cream">
                  {profile.email ?? "No email synced"}
                </p>
              </div>
            </section>

            <section className="do-card p-5">
              <p className="do-eyebrow">Club Memberships</p>
              <div className="mt-4 space-y-3">
                {profile.clubMemberships.length ? (
                  profile.clubMemberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="rounded-[20px] border border-hairline bg-surface/55 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-medium text-cream">
                          {membership.name}
                        </p>
                        <span className="do-pill">{membership.role}</span>
                      </div>
                      <p className="mt-2 text-[12px] leading-6 text-tan">
                        Joined {formatDate(membership.joinedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                    No club memberships recorded yet.
                  </div>
                )}
              </div>
            </section>

            <section className="do-card p-5">
              <p className="do-eyebrow">Recent Event Tickets</p>
              <div className="mt-4 space-y-3">
                {profile.eventTickets.length ? (
                  profile.eventTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-[20px] border border-hairline bg-surface/55 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-medium text-cream">
                          {ticket.eventTitle}
                        </p>
                        {ticket.code ? <span className="do-pill">{ticket.code}</span> : null}
                        <span className="do-pill">
                          {formatTicketStatus(ticket)}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-6 text-tan">
                        {ticket.clubName} · Requested {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 p-4 text-[13px] leading-6 text-tan">
                    No event tickets issued for this member yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-hairline bg-surface/55 p-5 text-[13px] leading-6 text-tan">
            Loading member details...
          </div>
        )}
      </div>
    </div>
  )
}
