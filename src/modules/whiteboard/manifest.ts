import { ScanLineIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const whiteboardSection: WorkspaceSection = {
  id: "whiteboard",
  href: "/whiteboard",
  match: "prefix",
  navLabel: "Gate & Polls",
  title: "Gate & Polls",
  subtitle:
    "Operational views for passes, scan desks, decisions, and quiet notifications.",
  room: "gate-ops",
  icon: ScanLineIcon,
}
