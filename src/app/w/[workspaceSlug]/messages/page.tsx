import { LiveMessagesPage } from "@/modules/messages/components/live-messages-page"

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveMessagesPage workspaceSlug={workspaceSlug} />
}
