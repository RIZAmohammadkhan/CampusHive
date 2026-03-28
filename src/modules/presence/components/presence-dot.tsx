import { cn } from "@/lib/utils"

export type PresenceStatus = "online" | "idle" | "offline"

const statusStyles: Record<PresenceStatus, { className: string; label: string }> =
  {
    online: { className: "bg-sage", label: "Online" },
    idle: { className: "bg-tan/50", label: "Idle" },
    offline: { className: "bg-offline", label: "Offline" },
  }

export function PresenceDot({
  status,
  className,
}: {
  status: PresenceStatus
  className?: string
}) {
  const style = statusStyles[status]

  return (
    <span
      role="img"
      aria-label={style.label}
      className={cn("size-2 shrink-0 rounded-full", style.className, className)}
    />
  )
}

