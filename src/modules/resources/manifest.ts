import { LibraryBigIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const resourcesSection: WorkspaceSection = {
  id: "resources",
  href: "/docs",
  match: "prefix",
  navLabel: "Resources",
  title: "Resources",
  subtitle:
    "Keep playbooks, club notes, and reusable campus context easy to find.",
  room: "resources",
  icon: LibraryBigIcon,
}
