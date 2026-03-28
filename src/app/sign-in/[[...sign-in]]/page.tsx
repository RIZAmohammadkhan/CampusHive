import { SignIn } from "@clerk/nextjs"

import { SIGN_UP_PATH } from "@/lib/workspaces"

export default function SignInPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(196,120,90,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(107,127,163,0.16),_transparent_28%)]" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_440px]">
        <section className="do-surface flex flex-col justify-between gap-8 p-6 md:p-8 lg:p-10">
          <div className="space-y-5">
            <p className="do-eyebrow">CampusHive</p>
            <h1 className="do-heading max-w-2xl">
              One login for every club, event, and student community on campus.
            </h1>
            <p className="max-w-xl text-[14px] leading-7 text-tan">
              Sign in to open your campus hub, catch up on announcements, and step
              into the shared operating layer for every community you belong to.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="do-card p-4">
              <div className="do-stat-label">Clubs</div>
              <div className="mt-3 do-stat-value">Visible</div>
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Discover communities without chasing links or DMs.
              </p>
            </div>
            <div className="do-card p-4">
              <div className="do-stat-label">Events</div>
              <div className="mt-3 do-stat-value">Shared</div>
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Calendars, reminders, and meeting context stay together.
              </p>
            </div>
            <div className="do-card p-4">
              <div className="do-stat-label">Ops</div>
              <div className="mt-3 do-stat-value">Ready</div>
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Tasks, passes, and decisions stay coordinated.
              </p>
            </div>
          </div>
        </section>

        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl={SIGN_UP_PATH}
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </main>
  )
}
