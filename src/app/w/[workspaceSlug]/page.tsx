import { LiveOfficePage } from "@/modules/dashboard/components/live-office-page"

export default async function OfficePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveOfficePage workspaceSlug={workspaceSlug} />
}
