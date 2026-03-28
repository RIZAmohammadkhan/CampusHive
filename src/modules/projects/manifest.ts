import { FolderKanbanIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const projectsSection: WorkspaceSection = {
  id: "projects",
  href: "/projects",
  match: "prefix",
  navLabel: "Event Ops",
  title: "Event Ops",
  subtitle:
    "Assign volunteer tasks, track ownership, and react before small slips become event-day chaos.",
  room: "event-ops",
  icon: FolderKanbanIcon,
}
