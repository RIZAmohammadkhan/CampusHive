import { LiveWhiteboardPage } from "@/components/app/live-whiteboard-page"

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveWhiteboardPage workspaceSlug={workspaceSlug} />
}
