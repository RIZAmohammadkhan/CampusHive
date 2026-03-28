import { MessageSquareTextIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const channelsSection: WorkspaceSection = {
  id: "channels",
  href: "/channels",
  match: "prefix",
  navLabel: "Clubs",
  title: "Club Spaces",
  subtitle:
    "Browse communities, open shared channels, and keep announcements visible.",
  room: "clubs",
  icon: MessageSquareTextIcon,
}
