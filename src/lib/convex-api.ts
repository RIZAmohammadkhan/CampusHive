import { channelsApi } from "@/modules/channels/api"
import { dashboardApi } from "@/modules/dashboard/api"
import { eventsApi } from "@/modules/events/api"
import { presenceApi } from "@/modules/presence/api"
import { projectsApi } from "@/modules/projects/api"
import { resourcesApi } from "@/modules/resources/api"
import { whiteboardApi } from "@/modules/whiteboard/api"
import { workspaceApi } from "@/modules/workspace/api"

export type {
  ChannelListData,
  ChannelMembershipState,
  ClubOperationsData,
  ClubRole,
  ConversationData,
  MessageData,
} from "@/modules/channels/api"
export type { OfficeData } from "@/modules/dashboard/api"
export type { EventsScheduleData } from "@/modules/events/api"
export type { PresenceData } from "@/modules/presence/api"
export type { ProjectsBoardData } from "@/modules/projects/api"
export type { ResourceLibraryData } from "@/modules/resources/api"
export type { WhiteboardControlRoomData } from "@/modules/whiteboard/api"
export type {
  DirectoryData,
  MemberProfileData,
  ViewerData,
} from "@/modules/workspace/api"

export { channelsApi, dashboardApi, eventsApi, presenceApi, projectsApi, resourcesApi }
export { whiteboardApi, workspaceApi }

export const convexApi = {
  workspaces: workspaceApi,
  presence: presenceApi,
  chat: channelsApi,
  dashboard: dashboardApi,
  projects: projectsApi,
  events: eventsApi,
  resources: resourcesApi,
  whiteboard: whiteboardApi,
}
