import { channelsApi } from "@/modules/channels/api"
import { dashboardApi } from "@/modules/dashboard/api"
import { eventsApi } from "@/modules/events/api"
import { messagesApi } from "@/modules/messages/api"
import { presenceApi } from "@/modules/presence/api"
import { projectsApi } from "@/modules/projects/api"
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
export type {
  DirectMessageConversationData,
  DirectMessageListData,
} from "@/modules/messages/api"
export type { PresenceData } from "@/modules/presence/api"
export type { ProjectsBoardData } from "@/modules/projects/api"
export type {
  DirectoryData,
  MemberProfileData,
  ViewerData,
} from "@/modules/workspace/api"

export { channelsApi, dashboardApi, eventsApi, messagesApi, presenceApi, projectsApi }
export { workspaceApi }

export const convexApi = {
  workspaces: workspaceApi,
  presence: presenceApi,
  chat: channelsApi,
  messages: messagesApi,
  dashboard: dashboardApi,
  projects: projectsApi,
  events: eventsApi,
}
