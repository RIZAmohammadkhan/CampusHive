import { SignUp } from "@clerk/nextjs"

import { SIGN_IN_PATH } from "@/lib/workspaces"

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(107,127,163,0.1),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(122,158,126,0.08),_transparent_35%)]" />
      <div className="relative flex w-full max-w-md flex-col gap-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-light tracking-tight text-parchment">
            Join CampusHive
          </h1>
          <p className="text-sm font-light text-tan">
            Create your account to connect with your campus
          </p>
        </div>

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
