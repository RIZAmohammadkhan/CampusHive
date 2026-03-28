"use client"

import { type FormEvent, type ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import type { MessageData } from "@/modules/channels/api"
import {
  buildMessageTimeline,
  formatMessageTime,
} from "@/modules/channels/components/conversation-utils"

const composerClassName =
  "min-h-20 w-full rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-field px-4 py-3 text-[14px] leading-6 text-parchment outline-none transition-[border-color,box-shadow] placeholder:text-tan focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"

type ThreadLink = {
  active?: boolean
  href: string
  label: string
}

export function MinimalChatThread({
  backHref,
  backLabel,
  title,
  subtitle,
  scopeLabel,
  headerAction,
  threadLinks = [],
  threadLinksAction,
  threadLinksPanel,
  topContent,
  messages,
  canPostMessages,
  draft,
  onDraftChange,
  onSubmit,
  isPending,
  placeholder,
  emptyState,
  composerHint,
  composerAction,
  readOnlyMessage,
  authorHref,
}: {
  backHref: string
  backLabel: string
  title: string
  subtitle?: string
  scopeLabel?: string
  headerAction?: ReactNode
  threadLinks?: ThreadLink[]
  threadLinksAction?: ReactNode
  threadLinksPanel?: ReactNode
  topContent?: ReactNode
  messages: MessageData[]
  canPostMessages: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isPending: boolean
  placeholder: string
  emptyState: string
  composerHint?: string
  composerAction?: ReactNode
  readOnlyMessage?: string
  authorHref?: (authorId: string) => string | null
}) {
  const timeline = buildMessageTimeline(messages)
  const hasComposerMeta = Boolean(composerAction || composerHint)

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <section className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <Link
                href={backHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-fit text-tan"
                )}
              >
                {backLabel}
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[24px] font-semibold tracking-tight text-cream">
                    {title}
                  </h1>
                  {scopeLabel ? (
                    <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-tan">
                      {scopeLabel}
                    </span>
                  ) : null}
                </div>
                {subtitle ? (
                  <p className="mt-1 text-[13px] leading-6 text-tan">{subtitle}</p>
                ) : null}
              </div>
            </div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>

          {threadLinks.length || threadLinksAction ? (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                {threadLinks.length ? (
                  <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                    {threadLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                          link.active
                            ? "border-[rgba(201,132,122,0.22)] bg-[rgba(201,132,122,0.12)] text-parchment"
                            : "border-hairline bg-surface/60 text-tan hover:text-parchment"
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                {threadLinksAction ? <div className="shrink-0">{threadLinksAction}</div> : null}
              </div>

              {threadLinksPanel ? <div className="mt-3">{threadLinksPanel}</div> : null}
            </div>
          ) : null}
        </div>

        <div className="bg-black/10">
          {topContent ? (
            <div className="border-b border-hairline px-4 py-4 sm:px-6">{topContent}</div>
          ) : null}

          <div className="max-h-[68dvh] overflow-y-auto px-4 py-5 sm:px-6">
            {timeline.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-hairline bg-surface/45 px-4 py-5 text-[13px] leading-6 text-tan">
                {emptyState}
              </div>
            ) : (
              <div className="space-y-5">
                {timeline.map((item) =>
                  item.type === "divider" ? (
                    <div key={item.key} className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-hairline" />
                      <span className="text-[10px] tracking-[0.16em] text-tan uppercase">
                        {item.label}
                      </span>
                      <div className="h-px flex-1 bg-hairline" />
                    </div>
                  ) : (
                    <div
                      key={item.key}
                      className={cn(
                        "flex",
                        item.author.isCurrentUser ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className="max-w-[min(78%,680px)]">
                        <div
                          className={cn(
                            "mb-2 flex items-center gap-2 text-[11px] text-tan",
                            item.author.isCurrentUser && "justify-end"
                          )}
                        >
                          {authorHref && !item.author.isCurrentUser ? (
                            <Link
                              href={authorHref(item.author.id) ?? "#"}
                              className="transition-colors hover:text-parchment"
                            >
                              {item.author.name}
                            </Link>
                          ) : (
                            <span>{item.author.isCurrentUser ? "You" : item.author.name}</span>
                          )}
                          <span>{formatMessageTime(item.createdAt)}</span>
                        </div>

                        <div className="space-y-2">
                          {item.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className={cn(
                                "rounded-[16px] border px-4 py-3 text-[14px] leading-6",
                                item.author.isCurrentUser
                                  ? "border-[rgba(201,132,122,0.2)] bg-[rgba(201,132,122,0.14)] text-parchment"
                                  : "border-hairline bg-surface/80 text-parchment"
                              )}
                            >
                              {entry.body}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {canPostMessages ? (
            <form onSubmit={onSubmit} className="border-t border-hairline px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={placeholder}
                  className={composerClassName}
                  disabled={isPending}
                />
                <div
                  className={cn(
                    "flex flex-col gap-3 sm:flex-row sm:items-center",
                    hasComposerMeta ? "sm:justify-between" : "sm:justify-end"
                  )}
                >
                  {hasComposerMeta ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {composerAction}
                      {composerHint ? (
                        <p className="text-[12px] leading-6 text-tan">{composerHint}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={isPending || !draft.trim()}
                    className="sm:shrink-0"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="border-t border-hairline px-4 py-4 text-[13px] leading-6 text-tan sm:px-6">
              {readOnlyMessage ?? "Discussion is read-only right now."}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
