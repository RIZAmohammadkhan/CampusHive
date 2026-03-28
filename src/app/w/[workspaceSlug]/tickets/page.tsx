import { LiveTicketsPage } from "@/modules/tickets/components/live-tickets-page"

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveTicketsPage workspaceSlug={workspaceSlug} />
}
