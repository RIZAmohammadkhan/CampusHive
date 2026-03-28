import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"

import { INVITE_NEEDED_PATH } from "@/lib/workspaces"
import { AppSidebar } from "@/modules/workspace/components/sidebar"
import { AppTopbar } from "@/modules/workspace/components/topbar"
import { WorkspaceRuntime } from "@/modules/workspace/components/workspace-runtime"

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
    <div className="relative min-h-dvh bg-background text-foreground">
      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        <AppSidebar workspaceSlug={workspaceSlug} />
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceRuntime workspaceSlug={workspaceSlug} />
          <AppTopbar workspaceSlug={workspaceSlug} />
          <main className="min-h-0 flex-1 overflow-auto px-4 py-4 md:px-5 md:py-5 lg:px-6">
            <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 lg:gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
