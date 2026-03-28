import { redirect } from "next/navigation"

import { workspaceMessagePath } from "@/lib/workspaces"
import { LiveClubPage } from "@/modules/channels/components/live-club-page"

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string[] }>
}) {
  const { workspaceSlug, slug } = await params
  const [clubSlug, sectionSlug] = slug

  if (clubSlug.startsWith("dm-")) {
    redirect(workspaceMessagePath(workspaceSlug, clubSlug))
  }

  return (
    <LiveClubPage
      workspaceSlug={workspaceSlug}
      clubSlug={clubSlug}
      sectionSlug={sectionSlug}
    />
  )
}
