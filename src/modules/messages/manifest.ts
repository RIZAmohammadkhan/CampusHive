import { MessageCircleIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const messagesSection: WorkspaceSection = {
  id: "messages",
  href: "/messages",
  match: "prefix",
  navLabel: "Messages",
  title: "Messages",
  subtitle: "Direct messages with dedicated threads and faster follow-up.",
  room: "messages",
  icon: MessageCircleIcon,
}
