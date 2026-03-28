import { LivePeoplePage } from "@/modules/people/components/live-people-page"

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LivePeoplePage workspaceSlug={workspaceSlug} />
}
