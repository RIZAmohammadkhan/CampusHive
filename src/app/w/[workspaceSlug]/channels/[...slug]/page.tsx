import { LiveChannelPage } from "@/modules/channels/components/live-channel-page"

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string[] }>
}) {
  const { workspaceSlug, slug } = await params

  return <LiveChannelPage workspaceSlug={workspaceSlug} slug={slug.join("/")} />
}
