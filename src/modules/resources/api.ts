import { mutationRef, queryRef } from "@/modules/core/convex/ref"

export type ResourceLibraryData = {
  canManage: boolean
  summary: Array<{ label: string; value: string; detail: string }>
  resources: Array<{
    id: string
    title: string
    summary: string
    tag: string
    ownerName: string
    updatedAt: number
  }>
}

export const resourcesApi = {
  library: queryRef<{ workspaceSlug: string }, ResourceLibraryData | null>(
    "resources:library"
  ),
  createResource: mutationRef<
    {
      workspaceSlug: string
      title: string
      summary: string
      tag: string
    },
    { resourceId: string }
  >("resources:createResource"),
}
