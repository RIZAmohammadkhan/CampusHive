"use client"

import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs"
import { ShieldCheckIcon } from "lucide-react"
import { useConvexAuth, useQuery } from "convex/react"
import { usePathname } from "next/navigation"

import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { convexApi } from "@/lib/convex-api"
import { WORKSPACE_HOME_PATTERN } from "@/lib/workspaces"

const contentForPath = (pathname: string, workspaceSlug: string) => {
  const workspacePrefix = `/w/${workspaceSlug}`
  const scopedPath = pathname.startsWith(workspacePrefix)
    ? pathname.slice(workspacePrefix.length) || "/"
    : pathname

  if (scopedPath === "/") {
    return {
      title: "Campus Hub",
      subtitle: "See communities, event operations, and live campus activity in one place.",
    }
  }

  if (scopedPath.startsWith("/channels")) {
    return {
      title: "Club Spaces",
      subtitle: "Browse communities, open shared channels, and keep announcements visible.",
    }
  }

  if (scopedPath.startsWith("/projects")) {
    return {
      title: "Event Ops",
      subtitle: "Assign volunteer tasks, track ownership, and react before small slips become event-day chaos.",
    }
  }

  if (scopedPath.startsWith("/docs")) {
    return {
      title: "Resources",
      subtitle: "Keep playbooks, club notes, and reusable campus context easy to find.",
    }
  }

  if (scopedPath.startsWith("/whiteboard")) {
    return {
      title: "Gate & Polls",
      subtitle: "Operational views for passes, scan desks, decisions, and quiet notifications.",
    }
  }

  if (scopedPath.startsWith("/calendar")) {
    return {
      title: "Events",
      subtitle: "Shared calendars for meetings, campus moments, and RSVP-ready planning.",
    }
  }

  return {
    title: "Campus Space",
    subtitle: "Live campus data is loaded for the current organization.",
  }
}

type AppTopbarProps = {
  workspaceSlug: string
}

export function AppTopbar({ workspaceSlug }: AppTopbarProps) {
  const pathname = usePathname() ?? "/"
  const enabled = useConvexConfigured()
  const { isAuthenticated } = useConvexAuth()
  const queryArgs = enabled && isAuthenticated ? { workspaceSlug } : "skip"
  const viewer = useQuery(convexApi.workspaces.viewer, queryArgs)
  const content = contentForPath(pathname, workspaceSlug)
  const { organization } = useOrganization()
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date())
  const roleLabel =
    viewer?.role === "admin"
      ? "Institute admin"
      : viewer?.role === "member"
        ? "Student member"
        : "Campus access"

  return (
    <header className="sticky top-0 z-20 border-b border-hairline/80 bg-background/60 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="do-pill">{organization?.slug ?? workspaceSlug}</span>
              <span className="do-pill">{today}</span>
              <span className="do-pill">
                <ShieldCheckIcon className="size-3.5" />
                {roleLabel}
              </span>
            </div>
            <div>
              <h1 className="font-display text-[26px] leading-none text-cream">
                {content.title}
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-tan">
                {content.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl={WORKSPACE_HOME_PATTERN}
              afterSelectOrganizationUrl={WORKSPACE_HOME_PATTERN}
            />
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}
