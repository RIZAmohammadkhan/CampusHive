import { redirect } from "next/navigation"

import { workspacePath } from "@/lib/workspaces"

export default async function DocsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params

  redirect(workspacePath(workspaceSlug))
}
