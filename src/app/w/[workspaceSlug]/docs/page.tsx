import { LiveDocsPage } from "@/modules/resources/components/live-docs-page"

export default async function DocsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveDocsPage workspaceSlug={workspaceSlug} />
}
