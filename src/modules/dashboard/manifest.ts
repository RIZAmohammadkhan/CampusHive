import { LayoutGridIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const dashboardSection: WorkspaceSection = {
  id: "dashboard",
  href: "/",
  match: "exact",
  navLabel: "Hub",
  title: "Campus Hub",
  subtitle:
    "See communities, event operations, and live campus activity in one place.",
  room: "hub",
  icon: LayoutGridIcon,
}
