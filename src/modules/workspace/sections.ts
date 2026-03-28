import { channelsSection } from "@/modules/channels/manifest"
import { dashboardSection } from "@/modules/dashboard/manifest"
import { eventsSection } from "@/modules/events/manifest"
import { messagesSection } from "@/modules/messages/manifest"
import { peopleSection } from "@/modules/people/manifest"
import { projectsSection } from "@/modules/projects/manifest"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const workspaceSections = [
  dashboardSection,
  messagesSection,
  channelsSection,
  peopleSection,
  projectsSection,
  eventsSection,
] as const satisfies readonly WorkspaceSection[]

export function getWorkspaceScopedPath(pathname: string, workspaceSlug: string) {
  const prefix = `/w/${workspaceSlug}`

  if (!pathname.startsWith(prefix)) {
    return "/"
  }

  return pathname.slice(prefix.length) || "/"
}

function matchesSection(scopedPath: string, section: WorkspaceSection) {
  return section.match === "exact"
    ? scopedPath === section.href
    : scopedPath === section.href || scopedPath.startsWith(`${section.href}/`)
}

export function getWorkspaceSection(pathname: string, workspaceSlug: string) {
  const scopedPath = getWorkspaceScopedPath(pathname, workspaceSlug)

  return (
    workspaceSections.find((section) => matchesSection(scopedPath, section)) ??
    null
  )
}

export function getWorkspaceRoom(pathname: string, workspaceSlug: string) {
  return getWorkspaceSection(pathname, workspaceSlug)?.room ?? "campus"
}
