"use client"

import { useState, useTransition } from "react"
import { FileTextIcon, PlusIcon, VoteIcon } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { LiveLoadingState } from "@/components/app/live-loading-state"
import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { convexApi } from "@/lib/convex-api"

const textareaClassName =
  "min-h-28 w-full rounded-2xl border border-hairline bg-field/90 px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-colors duration-150 ease-out placeholder:text-tan focus:border-ring focus:ring-3 focus:ring-ring/30"

function formatUpdated(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))
}

export function LiveDocsPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Campus resources need a live Convex deployment."
        body="Shared documents, playbooks, and reusable club context now come from Convex so each campus can build a durable operating memory."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveDocsPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveDocsPageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const data = useQuery(convexApi.resources.library, { workspaceSlug })
  const createResource = useMutation(convexApi.resources.createResource)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [tag, setTag] = useState("Playbook")
  const [isPending, startTransition] = useTransition()

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading campus resources"
        body="Convex is syncing saved playbooks, reusable notes, and resource ownership for this campus."
      />
    )
  }

  const handleCreateResource = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        await createResource({
          workspaceSlug,
          title,
          summary,
          tag,
        })
        setTitle("")
        setSummary("")
        setTag("Playbook")
        toast.success("Resource saved")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save resource."
        )
      }
    })
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="do-eyebrow">Resources & Context</p>
            <h2 className="do-heading max-w-3xl">
              Give clubs a memory, not just a stream of disappearing messages.
            </h2>
            <p className="max-w-2xl do-copy">
              Store playbooks, notes, and repeatable event context so each new
              committee starts with clarity instead of oral tradition.
            </p>
          </div>

          <div className="do-panel p-5">
            <p className="do-stat-label">Decision Layer</p>
            <p className="mt-3 text-[22px] font-medium text-cream">
              Polls and community decisions fit naturally beside saved resources.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              This route is the home for reusable context today, and it also maps
              cleanly to future live voting and decision history without a nav change.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.summary.map((metric) => (
          <div key={metric.label} className="do-card p-5">
            <p className="do-stat-label">{metric.label}</p>
            <p className="mt-4 do-stat-value">{metric.value}</p>
            <p className="mt-2 text-[12px] leading-6 text-tan">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <p className="do-eyebrow">Resource Library</p>
            <h3 className="mt-2 do-subheading">Saved context for clubs and organizers</h3>
          </div>

          {data.resources.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.resources.map((resource) => (
                <div key={resource.id} className="do-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-medium text-cream">
                        {resource.title}
                      </p>
                      <p className="mt-2 text-[13px] leading-6 text-tan">
                        {resource.summary}
                      </p>
                    </div>
                    <span className="do-pill">{resource.tag}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="do-pill">
                      <FileTextIcon className="size-3.5" />
                      {resource.ownerName}
                    </span>
                    <span className="do-pill">Updated {formatUpdated(resource.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="do-panel p-6 text-[13px] leading-6 text-tan">
              No resources yet. Save your first playbook, meeting note, or checklist
              so campus context starts compounding instead of resetting each term.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="do-panel p-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="do-eyebrow">Create Resource</p>
                <h3 className="mt-2 text-[20px] font-medium text-cream">
                  Publish a reusable note
                </h3>
              </div>
              {!data.canManage ? <span className="do-pill">Institute admins only</span> : null}
            </div>

            <form onSubmit={handleCreateResource} className="mt-5 space-y-3">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Resource title"
                disabled={!data.canManage || isPending}
              />
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="What should the next organizer know?"
                className={textareaClassName}
                disabled={!data.canManage || isPending}
              />
              <Input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                placeholder="Playbook"
                disabled={!data.canManage || isPending}
              />
              <Button
                type="submit"
                disabled={!data.canManage || isPending || !title.trim() || !summary.trim()}
              >
                <PlusIcon className="size-4" />
                Save resource
              </Button>
            </form>
          </section>

          <section className="do-panel p-5">
            <p className="do-eyebrow">Future Decision Flows</p>
            <div className="mt-4 space-y-3">
              <div className="do-card p-4">
                <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                  <VoteIcon className="size-4 text-slate" />
                  Anonymous date polls
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Choose event dates and compare turnout in one campus-native flow.
                </p>
              </div>
              <div className="do-card p-4">
                <div className="inline-flex items-center gap-2 text-[12px] text-parchment">
                  <VoteIcon className="size-4 text-sage" />
                  Team lead selection
                </div>
                <p className="mt-2 text-[12px] leading-6 text-tan">
                  Put role picks and project decisions next to the context that informed them.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
