import { LayoutGridIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const dashboardSection: WorkspaceSection = {
  id: "dashboard",
  href: "/",
  match: "exact",
  navLabel: "Hub",
  title: "Campus Hub",
  subtitle: "Overview of activity and status.",
  room: "hub",
  icon: LayoutGridIcon,
}
