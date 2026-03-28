import type { LucideIcon } from "lucide-react"

export type WorkspaceSection = {
  id: string
  href: string
  match: "exact" | "prefix"
  navLabel: string
  title: string
  subtitle: string
  room: string
  icon: LucideIcon
}
