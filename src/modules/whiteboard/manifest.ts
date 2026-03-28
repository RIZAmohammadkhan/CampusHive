import { ScanLineIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const whiteboardSection: WorkspaceSection = {
  id: "whiteboard",
  href: "/whiteboard",
  match: "prefix",
  navLabel: "Gate & Polls",
  title: "Gate & Polls",
  subtitle: "Passes, check-ins, and polls.",
  room: "gate-ops",
  icon: ScanLineIcon,
}
