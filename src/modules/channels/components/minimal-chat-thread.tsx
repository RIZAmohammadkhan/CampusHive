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
  "max-h-32 min-h-14 w-full resize-none rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-field px-4 py-3 text-[14px] leading-6 text-parchment outline-none transition-[border-color,box-shadow] placeholder:text-tan focus:border-[rgba(201,132,122,0.5)] focus:ring-3 focus:ring-[rgba(201,132,122,0.18)]"

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
    <div className="mx-auto w-full max-w-[960px]">
      <section className="do-surface flex h-[calc(100dvh-8rem)] min-h-[32rem] flex-col overflow-hidden sm:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-10rem)]">
        <div className="border-b border-hairline bg-surface/96 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 text-tan"
              )}
            >
              {backLabel}
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[18px] font-semibold tracking-tight text-cream sm:text-[20px]">
                  {title}
                </h1>
                {scopeLabel ? (
                  <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-tan sm:text-[11px]">
                    {scopeLabel}
                  </span>
                ) : null}
              </div>
              {subtitle ? (
                <p className="mt-1 truncate text-[12px] leading-5 text-tan">{subtitle}</p>
              ) : null}
            </div>

            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>

          {threadLinks.length || threadLinksAction ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
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
                ) : null}

                {threadLinksAction ? (
                  <div className="w-full overflow-x-auto lg:w-auto lg:shrink-0">
                    {threadLinksAction}
                  </div>
                ) : null}
              </div>

              {threadLinksPanel ? <div>{threadLinksPanel}</div> : null}
            </div>
          ) : null}
        </div>

        {topContent ? (
          <div className="max-h-[24dvh] overflow-y-auto border-b border-hairline bg-black/10 px-4 py-3 sm:px-5">
            {topContent}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto bg-black/10 px-4 py-4 sm:px-5">
          {timeline.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-hairline bg-surface/45 px-4 py-4 text-[13px] leading-6 text-tan">
              {emptyState}
            </div>
          ) : (
            <div className="space-y-4">
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
                    <div className="max-w-[min(90%,680px)] sm:max-w-[min(82%,680px)]">
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
                              "rounded-[18px] border px-4 py-3 text-[14px] leading-6",
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
          <form
            onSubmit={onSubmit}
            className="border-t border-hairline bg-surface/96 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl sm:px-5"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={placeholder}
                  className={composerClassName}
                  disabled={isPending}
                  rows={1}
                />
                <Button
                  type="submit"
                  disabled={isPending || !draft.trim()}
                  className="shrink-0 self-end"
                >
                  Send
                </Button>
              </div>

              {hasComposerMeta ? (
                <div className="flex flex-wrap items-center gap-2 text-[12px] leading-6 text-tan">
                  <div className="flex flex-wrap items-center gap-2">
                    {composerAction}
                    {composerHint ? <p>{composerHint}</p> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="border-t border-hairline bg-surface/96 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-[13px] leading-6 text-tan backdrop-blur-xl sm:px-5">
            {readOnlyMessage ?? "Discussion is read-only right now."}
          </div>
        )}
      </section>
    </div>
  )
}
