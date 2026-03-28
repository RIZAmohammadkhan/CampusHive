"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { AppSidebar } from "@/modules/workspace/components/sidebar"
import { AppTopbar } from "@/modules/workspace/components/topbar"
import { WorkspaceRuntime } from "@/modules/workspace/components/workspace-runtime"

type WorkspaceShellProps = {
  workspaceSlug: string
  children: ReactNode
}

export function WorkspaceShell({
  workspaceSlug,
  children,
}: WorkspaceShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileSidebarOpen])

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [mobileSidebarOpen])

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <WorkspaceRuntime workspaceSlug={workspaceSlug} />

      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
            mobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          )}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(85vw,320px)] max-w-full -translate-x-full transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[280px] lg:translate-x-0",
            mobileSidebarOpen && "translate-x-0"
          )}
        >
          <AppSidebar
            workspaceSlug={workspaceSlug}
            showMobileClose={mobileSidebarOpen}
            onCloseMobileMenu={() => setMobileSidebarOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            workspaceSlug={workspaceSlug}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            mobileSidebarOpen={mobileSidebarOpen}
          />
          <main className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6">
            <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 sm:gap-5 lg:gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
