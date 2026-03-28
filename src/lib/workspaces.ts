export const INVITE_NEEDED_PATH = "/invite-needed"
export const SIGN_IN_PATH = "/sign-in"
export const SIGN_UP_PATH = "/sign-up"
export const WORKSPACE_HOME_PATTERN = "/w/:slug"

export function workspacePath(workspaceSlug: string, path = "") {
  const normalizedPath =
    !path || path === "/"
      ? ""
      : path.startsWith("/")
        ? path
        : `/${path}`

  return `/w/${workspaceSlug}${normalizedPath}`
}

export function workspaceClubsPath(workspaceSlug: string) {
  return workspacePath(workspaceSlug, "/channels")
}

export function workspaceClubPath(workspaceSlug: string, clubSlug: string) {
  return workspacePath(workspaceSlug, `/channels/${clubSlug}`)
}

export function workspaceClubDiscussionPath(
  workspaceSlug: string,
  clubSlug: string,
  sectionSlug: string
) {
  return workspacePath(workspaceSlug, `/channels/${clubSlug}/${sectionSlug}`)
}

export function workspaceMessagesPath(workspaceSlug: string) {
  return workspacePath(workspaceSlug, "/messages")
}

export function workspaceMessagePath(workspaceSlug: string, dmSlug: string) {
  return workspacePath(workspaceSlug, `/messages/${dmSlug}`)
}

export function workspacePeoplePath(workspaceSlug: string) {
  return workspacePath(workspaceSlug, "/people")
}

export function workspacePersonPath(workspaceSlug: string, userId: string) {
  return workspacePath(workspaceSlug, `/people/${userId}`)
}
