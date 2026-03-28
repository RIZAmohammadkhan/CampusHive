import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"

import { AppSidebar } from "@/components/app/sidebar"
import { AppTopbar } from "@/components/app/topbar"
import { WorkspaceRuntime } from "@/components/app/workspace-runtime"
import { INVITE_NEEDED_PATH } from "@/lib/workspaces"

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(216,198,173,0.1),_transparent_20%),radial-gradient(circle_at_bottom_left,_rgba(123,156,139,0.08),_transparent_18%)]" />
      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        <AppSidebar workspaceSlug={workspaceSlug} />
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceRuntime workspaceSlug={workspaceSlug} />
          <AppTopbar workspaceSlug={workspaceSlug} />
          <main className="min-h-0 flex-1 overflow-auto px-4 py-4 md:px-6 md:py-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 lg:gap-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
