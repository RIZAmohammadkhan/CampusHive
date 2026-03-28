import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { LiveTicketScanPage } from "@/modules/tickets/components/live-ticket-scan-page"

export default async function VerifyTicketPage({
  searchParams,
}: {
  searchParams: Promise<{
    workspaceSlug?: string
    clubSlug?: string
    eventId?: string
    ticketId?: string
    code?: string
  }>
}) {
  const params = await searchParams
  const workspaceSlug = params.workspaceSlug?.trim()
  const clubSlug = params.clubSlug?.trim()
  const eventId = params.eventId?.trim()
  const ticketId = params.ticketId?.trim()
  const code = params.code?.trim()

  if (!workspaceSlug || !clubSlug || !eventId || !ticketId || !code) {
    notFound()
  }

  const { userId, redirectToSignIn } = await auth()
  const returnBackUrl = `/verify/ticket?${new URLSearchParams({
    workspaceSlug,
    clubSlug,
    eventId,
    ticketId,
    code,
  }).toString()}`

  if (!userId) {
    return redirectToSignIn({ returnBackUrl })
  }

  return (
    <LiveTicketScanPage
      workspaceSlug={workspaceSlug}
      clubSlug={clubSlug}
      eventId={eventId}
      ticketId={ticketId}
      code={code}
    />
  )
}
