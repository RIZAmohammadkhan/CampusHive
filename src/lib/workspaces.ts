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
