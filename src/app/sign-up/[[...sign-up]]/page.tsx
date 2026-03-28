import { SignUp } from "@clerk/nextjs"

import { SIGN_IN_PATH } from "@/lib/workspaces"

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(107,127,163,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(122,158,126,0.12),_transparent_26%)]" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_440px]">
        <section className="do-surface flex flex-col justify-between gap-8 p-6 md:p-8 lg:p-10">
          <div className="space-y-5">
            <p className="do-eyebrow">Campus Setup</p>
            <h1 className="do-heading max-w-2xl">
              Create your account and bring your campus communities into one hub.
            </h1>
            <p className="max-w-xl text-[14px] leading-7 text-tan">
              Institute admins can create the first campus space after sign up.
              Students should use the same email address their community invite was
              sent to.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="do-card p-4">
              <div className="do-stat-label">1</div>
              <div className="mt-3 text-[18px] font-medium text-cream">
                Create account
              </div>
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Start with one identity for all campus spaces.
              </p>
            </div>
            <div className="do-card p-4">
              <div className="do-stat-label">2</div>
              <div className="mt-3 text-[18px] font-medium text-cream">
                Create campus
              </div>
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Use Organizations as the institute-level boundary and routing layer.
              </p>
            </div>
            <div className="do-card p-4">
              <div className="do-stat-label">3</div>
              <div className="mt-3 text-[18px] font-medium text-cream">
                Bring communities in
              </div>
              <p className="mt-2 text-[12px] leading-6 text-tan">
                Invite club leads and students into the existing campus space.
              </p>
            </div>
          </div>
        </section>

        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl={SIGN_IN_PATH}
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </main>
  )
}
