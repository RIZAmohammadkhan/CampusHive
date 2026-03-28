import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"

import { INVITE_NEEDED_PATH } from "@/lib/workspaces"
import { WorkspaceShell } from "@/modules/workspace/components/workspace-shell"

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { userId, orgSlug, redirectToSignIn } = await auth()

  if (!userId) {
    return redirectToSignIn()
  }

  if (!orgSlug) {
    redirect(INVITE_NEEDED_PATH)
  }

  if (orgSlug !== workspaceSlug) {
    notFound()
  }

  return (
    <WorkspaceShell workspaceSlug={workspaceSlug}>{children}</WorkspaceShell>
  )
}
