import { LiveChannelsPage } from "@/modules/channels/components/live-channels-page"

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveChannelsPage workspaceSlug={workspaceSlug} />
}
