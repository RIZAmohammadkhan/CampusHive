type LiveLoadingStateProps = {
  title: string
  body: string
}

export function LiveLoadingState({
  title,
  body,
}: LiveLoadingStateProps) {
  return (
    <div className="do-surface p-6 md:p-8 lg:p-10">
      <p className="do-eyebrow">Syncing campus</p>
      <h2 className="mt-3 do-subheading">{title}</h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-7 text-tan">{body}</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="do-card h-28 animate-pulse bg-elevated/55 p-4"
          />
        ))}
      </div>
    </div>
  )
}
