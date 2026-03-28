import { LayoutGridIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const dashboardSection: WorkspaceSection = {
  id: "dashboard",
  href: "/",
  match: "exact",
  navLabel: "Hub",
  title: "Overview",
  subtitle: "Only what matters right now.",
  room: "hub",
  icon: LayoutGridIcon,
}
