import { FolderKanbanIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const projectsSection: WorkspaceSection = {
  id: "projects",
  href: "/projects",
  match: "prefix",
  navLabel: "Tasks",
  title: "Tasks",
  subtitle: "Track work and ownership.",
  room: "tasks",
  icon: FolderKanbanIcon,
}
