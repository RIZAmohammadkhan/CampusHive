import { CalendarDaysIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const eventsSection: WorkspaceSection = {
  id: "events",
  href: "/calendar",
  match: "prefix",
  navLabel: "Events",
  title: "Events",
  subtitle:
    "Shared calendars for meetings, campus moments, and RSVP-ready planning.",
  room: "events",
  icon: CalendarDaysIcon,
}
