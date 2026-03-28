"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2Icon, LoaderCircleIcon, TicketIcon, XCircleIcon } from "lucide-react"
import { useMutation } from "convex/react"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { workspaceClubPath, workspaceTicketsPath } from "@/lib/workspaces"
import { channelsApi } from "@/modules/channels/api"

type ScanStatus =
  | { state: "loading" }
  | {
      state: "done"
      valid: boolean
      message: string
      attendeeName: string | null
      attendeeEmail: string | null
      checkedInAt: number | null
      checkedInByName: string | null
      code: string | null
    }
  | { state: "error"; message: string }

export function LiveTicketScanPage({
  workspaceSlug,
  clubSlug,
  eventId,
  ticketId,
  code,
}: {
  workspaceSlug: string
  clubSlug: string
  eventId: string
  ticketId: string
  code: string
}) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Ticket scanning needs Convex."
        body="Add your deployment URL and run Convex to enable QR check-in."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveTicketScanPageInner
        workspaceSlug={workspaceSlug}
        clubSlug={clubSlug}
        eventId={eventId}
        ticketId={ticketId}
        code={code}
      />
    </ConvexAuthGate>
  )
}

function LiveTicketScanPageInner({
  workspaceSlug,
  clubSlug,
  eventId,
  ticketId,
  code,
}: {
  workspaceSlug: string
  clubSlug: string
  eventId: string
  ticketId: string
  code: string
}) {
  const scanClubTicketAndCheckIn = useMutation(channelsApi.scanClubTicketAndCheckIn)
  const [status, setStatus] = useState<ScanStatus>({ state: "loading" })

  useEffect(() => {
    let cancelled = false

    void scanClubTicketAndCheckIn({
      workspaceSlug,
      slug: clubSlug,
      eventId,
      ticketId,
      code,
    })
      .then((result) => {
        if (cancelled) {
          return
        }

        setStatus({
          state: "done",
          valid: result.valid,
          message: result.message,
          attendeeName: result.attendeeName,
          attendeeEmail: result.attendeeEmail,
          checkedInAt: result.checkedInAt,
          checkedInByName: result.checkedInByName,
          code: result.code,
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Ticket check-in failed.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [clubSlug, code, eventId, scanClubTicketAndCheckIn, ticketId, workspaceSlug])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[720px] items-center px-4 py-10">
      <section className="do-surface w-full p-6 sm:p-8">
        {status.state === "loading" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <LoaderCircleIcon className="size-5 animate-spin text-tan" />
              <p className="text-[14px] font-medium text-cream">Checking in ticket...</p>
            </div>
            <p className="text-[13px] leading-6 text-tan">
              Verifying the pass and applying check-in for this event.
            </p>
          </div>
        ) : status.state === "error" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <XCircleIcon className="size-5 text-rose" />
              <p className="text-[14px] font-medium text-cream">Check-in unavailable</p>
            </div>
            <p className="text-[13px] leading-6 text-tan">{status.message}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {status.valid ? (
                <CheckCircle2Icon className="size-5 text-sage" />
              ) : (
                <XCircleIcon className="size-5 text-rose" />
              )}
              <p className="text-[14px] font-medium text-cream">
                {status.valid ? "Scan complete" : "Scan rejected"}
              </p>
            </div>

            <p className="text-[13px] leading-6 text-tan">{status.message}</p>

            {status.attendeeName ? (
              <div className="rounded-[18px] border border-hairline bg-surface/55 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[16px] font-medium text-cream">{status.attendeeName}</p>
                  {status.code ? <span className="do-pill">{status.code}</span> : null}
                </div>
                {status.attendeeEmail ? (
                  <p className="mt-2 text-[12px] leading-6 text-tan">{status.attendeeEmail}</p>
                ) : null}
                {status.checkedInAt ? (
                  <p className="mt-1 text-[12px] leading-6 text-tan">
                    Checked in{status.checkedInByName ? ` by ${status.checkedInByName}` : ""}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={workspaceClubPath(workspaceSlug, clubSlug)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open club
          </Link>
          <Link
            href={workspaceTicketsPath(workspaceSlug)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <TicketIcon className="size-4" />
            Tickets
          </Link>
        </div>
      </section>
    </main>
  )
}
