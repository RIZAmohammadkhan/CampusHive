import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type PresenceData = Array<{
  name: string
  route: string
  routeLabel: string
  room: string
  imageUrl: string | null
  lastSeenAt: number
}>

export const presenceApi = {
  heartbeat: mutationRef<
    { workspaceSlug: string; route: string; room: string },
    null
  >("presence:heartbeat"),
  listActive: queryRef<{ workspaceSlug: string }, PresenceData>(
    "presence:listActive"
  ),
}
