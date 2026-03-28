import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { INVITE_NEEDED_PATH, workspacePath } from "@/lib/workspaces"

export default async function HomePage() {
  const { userId, orgSlug, redirectToSignIn } = await auth()

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/" })
  }

  redirect(orgSlug ? workspacePath(orgSlug) : INVITE_NEEDED_PATH)
}
