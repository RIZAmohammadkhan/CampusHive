import { LiveProjectsPage } from "@/components/app/live-projects-page"

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  return <LiveProjectsPage workspaceSlug={workspaceSlug} />
}
