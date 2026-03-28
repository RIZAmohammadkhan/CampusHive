import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="do-surface w-full max-w-2xl p-8 text-center md:p-10">
        <p className="do-eyebrow">Campus Access</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-cream md:text-5xl">
          We couldn&apos;t open that campus space.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[14px] leading-7 text-tan">
          The campus slug may be wrong, or your account may not have access to
          this institute yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-hairline bg-panel px-4 py-3 text-[12px] tracking-[0.08em] text-parchment uppercase transition-colors duration-150 hover:bg-elevated"
        >
          Go to campus selector
        </Link>
      </div>
    </main>
  )
}
