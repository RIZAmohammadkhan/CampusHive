import { FolderKanbanIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const projectsSection: WorkspaceSection = {
  id: "projects",
  href: "/projects",
  match: "prefix",
  navLabel: "Event Ops",
  title: "Event Ops",
  subtitle: "Track tasks and ownership.",
  room: "event-ops",
  icon: FolderKanbanIcon,
}
