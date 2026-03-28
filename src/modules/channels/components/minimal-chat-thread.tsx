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
  messages,
  canPostMessages,
  draft,
  onDraftChange,
  onSubmit,
  isPending,
  placeholder,
  emptyState,
  composerHint,
  authorHref,
}: {
  backHref: string
  backLabel: string
  title: string
  subtitle?: string
  scopeLabel?: string
  headerAction?: ReactNode
  threadLinks?: ThreadLink[]
  messages: MessageData[]
  canPostMessages: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isPending: boolean
  placeholder: string
  emptyState: string
  composerHint?: string
  authorHref?: (authorId: string) => string | null
}) {
  const timeline = buildMessageTimeline(messages)

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <section className="do-surface overflow-hidden">
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Link
                href={backHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-fit text-tan"
                )}
              >
                {backLabel}
              </Link>
              <div className="mt-4">
                {scopeLabel ? <p className="do-eyebrow">{scopeLabel}</p> : null}
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-cream">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-2 text-[13px] leading-6 text-tan">{subtitle}</p>
                ) : null}
              </div>
            </div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>

          {threadLinks.length ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
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
        </div>

        <div className="bg-black/10">
          <div className="max-h-[70dvh] overflow-y-auto px-4 py-5 sm:px-6">
            {timeline.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-hairline bg-surface/45 px-4 py-5 text-[13px] leading-6 text-tan">
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
                      <div className="max-w-[min(78%,680px)]">
                        <div
                          className={cn(
                            "mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-tan",
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
                                "rounded-[18px] border px-4 py-3 text-[14px] leading-7 shadow-[0_10px_28px_rgba(0,0,0,0.14)]",
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
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={placeholder}
                className={composerClassName}
                disabled={isPending}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-6 text-tan">
                  {composerHint ?? "Keep the conversation focused and easy to scan."}
                </p>
                <Button type="submit" disabled={isPending || !draft.trim()}>
                  Send
                </Button>
              </div>
            </form>
          ) : (
            <div className="border-t border-hairline px-4 py-4 text-[13px] leading-6 text-tan sm:px-6">
              Discussion is read-only right now.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
