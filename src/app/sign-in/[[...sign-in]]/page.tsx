import { SignIn } from "@clerk/nextjs"

import { SIGN_UP_PATH } from "@/lib/workspaces"

export default function SignInPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(217,149,111,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(107,127,163,0.1),_transparent_35%)]" />
      <div className="relative flex w-full max-w-md flex-col gap-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-light tracking-tight text-parchment">
            CampusHive
          </h1>
          <p className="text-sm font-light text-tan">
            Your campus community hub
          </p>
        </div>

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
