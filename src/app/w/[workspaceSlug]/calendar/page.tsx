import { LiveCalendarPage } from "@/modules/events/components/live-calendar-page"

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveCalendarPage workspaceSlug={workspaceSlug} />
}
