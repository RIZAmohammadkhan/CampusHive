import { OrganizationList, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import {
  INVITE_NEEDED_PATH,
  WORKSPACE_HOME_PATTERN,
  workspacePath,
} from "@/lib/workspaces"

export default async function InviteNeededPage() {
  const { userId, orgSlug, redirectToSignIn } = await auth()

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: INVITE_NEEDED_PATH })
  }

  if (orgSlug) {
    redirect(workspacePath(orgSlug))
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(240,230,211,0.1),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(122,158,126,0.12),_transparent_28%)]" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_1fr]">
          <section className="do-surface space-y-6 p-6 md:p-8 lg:p-10">
            <div className="space-y-3">
              <p className="do-eyebrow">Campus Access</p>
              <h1 className="do-heading max-w-2xl">
                You&apos;re signed in, but you don&apos;t have a campus space yet.
              </h1>
            </div>

            <div className="max-w-xl space-y-4 text-[14px] leading-7 text-tan">
              <p>
                If you&apos;re a student, ask your institute admin or club lead to
                send you an invitation before continuing.
              </p>
              <p>
                If you&apos;re setting up CampusHive for a college, create the first
                campus space below and we&apos;ll route you into it automatically.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="do-card p-4">
                <div className="do-stat-label">Students</div>
                <div className="mt-3 text-[18px] font-medium text-cream">
                  Wait for an invite
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Campus membership is the access boundary, so an admin needs to
                  add you first.
                </p>
              </div>
              <div className="do-card p-4">
                <div className="do-stat-label">Institute Admins</div>
                <div className="mt-3 text-[18px] font-medium text-cream">
                  Create the first campus
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Start with one organization, then invite clubs and students into it.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface/80 px-4 py-3 backdrop-blur">
              <div className="space-y-0.5">
                <div className="text-[13px] text-parchment">Signed in</div>
                <div className="text-[11px] tracking-[0.04em] text-tan">
                  Switch accounts if you expected access through a different email.
                </div>
              </div>
              <div className="ml-auto">
                <UserButton />
              </div>
            </div>
          </section>

          <section className="do-surface p-5">
            <OrganizationList
              hidePersonal
              afterCreateOrganizationUrl={WORKSPACE_HOME_PATTERN}
              afterSelectOrganizationUrl={WORKSPACE_HOME_PATTERN}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
