"use client"

import { type FormEvent, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { UserCircle2Icon } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { workspaceMessagesPath, workspacePersonPath } from "@/lib/workspaces"
import { MinimalChatThread } from "@/modules/channels/components/minimal-chat-thread"
import { messagesApi } from "@/modules/messages/api"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

export function LiveDirectMessagePage({
  workspaceSlug,
  dmSlug,
}: {
  workspaceSlug: string
  dmSlug: string
}) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Messages need Convex."
        body="Add your deployment URL and run Convex to load this direct message."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveDirectMessagePageInner workspaceSlug={workspaceSlug} dmSlug={dmSlug} />
    </ConvexAuthGate>
  )
}

function LiveDirectMessagePageInner({
  workspaceSlug,
  dmSlug,
}: {
  workspaceSlug: string
  dmSlug: string
}) {
  const conversation = useQuery(messagesApi.directMessageConversation, {
    workspaceSlug,
    slug: dmSlug,
  })
  const messages = useQuery(messagesApi.listDirectMessageMessages, {
    workspaceSlug,
    slug: dmSlug,
  })
  const sendDirectMessage = useMutation(messagesApi.sendDirectMessage)
  const markDirectMessageRead = useMutation(messagesApi.markDirectMessageRead)
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (conversation === undefined || messages === undefined) {
      return
    }

    if (!conversation || !conversation.canViewMessages) {
      return
    }

    void markDirectMessageRead({
      workspaceSlug,
      slug: dmSlug,
    })
  }, [conversation, dmSlug, markDirectMessageRead, messages, workspaceSlug])

  if (conversation === undefined || messages === undefined) {
    return (
      <LiveLoadingState
        title="Loading conversation"
        body="Syncing direct messages."
      />
    )
  }

  if (!conversation) {
    return (
      <div className="do-surface p-6 md:p-8 lg:p-10">
        <p className="do-eyebrow">Conversation missing</p>
        <h2 className="mt-3 do-subheading">
          This direct message is not available.
        </h2>
      </div>
    )
  }

  const otherMember = conversation.otherMember
  const canPostMessages = conversation.canPostMessages ?? conversation.canViewMessages

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()

    if (!trimmed) {
      return
    }

    startTransition(async () => {
      try {
        await sendDirectMessage({
          workspaceSlug,
          slug: dmSlug,
          body: trimmed,
        })
        setMessage("")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not send that message."
        )
      }
    })
  }

  const title = otherMember?.name ?? conversation.name
  const subtitle = otherMember ? conversation.description : undefined

  return (
    <MinimalChatThread
      backHref={workspaceMessagesPath(workspaceSlug)}
      backLabel="Messages"
      title={title}
      subtitle={subtitle}
      scopeLabel="Private"
      headerAction={
        otherMember ? (
          <Link
            href={workspacePersonPath(workspaceSlug, otherMember.id)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            <UserCircle2Icon className="size-4" />
            View profile
          </Link>
        ) : null
      }
      messages={messages}
      canPostMessages={canPostMessages}
      draft={message}
      onDraftChange={setMessage}
      onSubmit={handleSubmit}
      isPending={isPending}
      placeholder={`Write to ${title}`}
      emptyState="Start the conversation."
      composerHint="Only the two of you can see this."
      authorHref={(authorId) => workspacePersonPath(workspaceSlug, authorId)}
    />
  )
}
