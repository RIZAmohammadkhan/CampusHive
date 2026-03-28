import { TicketIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const ticketsSection: WorkspaceSection = {
  id: "tickets",
  href: "/tickets",
  match: "prefix",
  navLabel: "Tickets",
  title: "Tickets",
  subtitle: "Saved passes and requests.",
  room: "tickets",
  icon: TicketIcon,
}
