import { LiveDirectMessagePage } from "@/modules/messages/components/live-direct-message-page"

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; dmSlug: string[] }>
}) {
  const { workspaceSlug, dmSlug } = await params

  return (
    <LiveDirectMessagePage
      workspaceSlug={workspaceSlug}
      dmSlug={dmSlug.join("/")}
    />
  )
}
