type ConvexSetupNoticeProps = {
  title: string
  body: string
}

export function ConvexSetupNotice({
  title,
  body,
}: ConvexSetupNoticeProps) {
  return (
    <div className="do-surface p-6 md:p-8 lg:p-10">
      <p className="do-eyebrow">Convex setup required</p>
      <h2 className="mt-3 do-subheading">{title}</h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-7 text-tan">{body}</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="do-card p-4">
          <p className="do-stat-label">1</p>
          <p className="mt-3 text-[16px] font-medium text-cream">
            Add env vars
          </p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Set `NEXT_PUBLIC_CONVEX_URL` and `CLERK_JWT_ISSUER_DOMAIN` in `.env.local`.
          </p>
        </div>
        <div className="do-card p-4">
          <p className="do-stat-label">2</p>
          <p className="mt-3 text-[16px] font-medium text-cream">
            Activate Clerk + Convex
          </p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Turn on the Convex integration in Clerk so campus-scoped tokens include the active organization.
          </p>
        </div>
        <div className="do-card p-4">
          <p className="do-stat-label">3</p>
          <p className="mt-3 text-[16px] font-medium text-cream">
            Run `npm run convex:dev`
          </p>
          <p className="mt-2 text-[12px] leading-6 text-tan">
            Sync schema, auth config, and backend functions to your Convex deployment.
          </p>
        </div>
      </div>
    </div>
  )
}
