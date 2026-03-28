import { LiveDocsPage } from "@/components/app/live-docs-page"

export default async function DocsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveDocsPage workspaceSlug={workspaceSlug} />
}
