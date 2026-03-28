import type { MessageData } from "@/modules/channels/api"

export function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

export function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))
}

export function formatTimelineDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`))
}

export function formatRelativeActivity(timestamp: number | null) {
  if (!timestamp) {
    return "No activity yet"
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  if (diffMinutes < 1_440) {
    return `${Math.round(diffMinutes / 60)} hr ago`
  }

  return `${Math.round(diffMinutes / 1_440)} day ago`
}

export function membershipLabel(
  membershipState:
    | "public"
    | "admin"
    | "owner"
    | "officer"
    | "member"
    | "pending"
    | "notMember"
) {
  if (membershipState === "public") return "Campus-wide access"
  if (membershipState === "admin") return "College admin access"
  if (membershipState === "owner") return "Club owner"
  if (membershipState === "officer") return "Club officer"
  if (membershipState === "member") return "Joined member"
  if (membershipState === "pending") return "Request pending"
  return "Join required"
}

export function clubRoleLabel(role: "owner" | "officer" | "member") {
  if (role === "owner") return "Owner"
  if (role === "officer") return "Officer"
  return "Member"
}

export function clubInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (words.length === 0) {
    return "CL"
  }

  return words.map((word) => word.charAt(0).toUpperCase()).join("")
}

function sameDay(left: number, right: number) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

export type TimelineItem =
  | {
      type: "divider"
      key: string
      label: string
    }
  | {
      type: "group"
      key: string
      author: MessageData["author"]
      createdAt: number
      entries: MessageData[]
    }

export function buildMessageTimeline(messages: MessageData[]): TimelineItem[] {
  const items: TimelineItem[] = []
  let currentGroup: TimelineItem | null = null
  let lastDayKey: string | null = null

  for (const entry of messages) {
    const dayKey = new Date(entry.createdAt).toDateString()

    if (dayKey !== lastDayKey) {
      items.push({
        type: "divider",
        key: `day-${dayKey}`,
        label: formatTimelineDate(entry.createdAt),
      })
      lastDayKey = dayKey
      currentGroup = null
    }

    const previousEntry =
      currentGroup?.type === "group"
        ? currentGroup.entries[currentGroup.entries.length - 1]
        : null
    const withinFiveMinutes =
      previousEntry !== null &&
      entry.createdAt - previousEntry.createdAt < 5 * 60_000

    if (
      currentGroup?.type === "group" &&
      currentGroup.author.id === entry.author.id &&
      sameDay(currentGroup.createdAt, entry.createdAt) &&
      withinFiveMinutes
    ) {
      currentGroup.entries.push(entry)
      continue
    }

    currentGroup = {
      type: "group",
      key: entry.id,
      author: entry.author,
      createdAt: entry.createdAt,
      entries: [entry],
    }
    items.push(currentGroup)
  }

  return items
}

export function defaultDiscussionSlug(isGeneral: boolean) {
  return isGeneral ? "feed" : "general"
}
