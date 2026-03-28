import { UsersIcon } from "lucide-react"

import type { WorkspaceSection } from "@/modules/workspace/section"

export const peopleSection: WorkspaceSection = {
  id: "people",
  href: "/people",
  match: "prefix",
  navLabel: "People",
  title: "People",
  subtitle: "Member profiles, activity, and direct access.",
  room: "people",
  icon: UsersIcon,
}
