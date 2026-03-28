"use client"

import { useState, useTransition } from "react"
import {
  Clock3Icon,
  PlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { ConvexAuthGate } from "@/components/convex/convex-auth-gate"
import { useConvexConfigured } from "@/components/convex/convex-client-provider"
import { ConvexSetupNotice } from "@/components/convex/convex-setup-notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { projectsApi } from "@/modules/projects/api"
import { LiveLoadingState } from "@/modules/shared/components/live-loading-state"

const statIcons = [SparklesIcon, Clock3Icon, TriangleAlertIcon]
const selectClassName =
  "h-10 rounded-2xl border border-hairline bg-field/90 px-3 text-[13px] text-parchment outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
const statusOptions = [
  { id: "acknowledged", label: "Acknowledged" },
  { id: "inProgress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "flagged", label: "Needs help" },
] as const

function statusPill(status: (typeof statusOptions)[number]["id"]) {
  if (status === "acknowledged") return "Ready"
  if (status === "inProgress") return "Live"
  if (status === "done") return "Done"
  return "Blocked"
}

export function LiveProjectsPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Project persistence is handled by Convex."
        body="The project board, assignees, and admin controls now depend on Convex so ownership can stay durable and collaborative."
      />
    )
  }

  return (
    <ConvexAuthGate>
      <LiveProjectsPageInner workspaceSlug={workspaceSlug} />
    </ConvexAuthGate>
  )
}

function LiveProjectsPageInner({ workspaceSlug }: { workspaceSlug: string }) {
  const data = useQuery(projectsApi.board, { workspaceSlug })
  const createTask = useMutation(projectsApi.createTask)
  const assignTask = useMutation(projectsApi.assignTask)
  const updateTaskStatus = useMutation(projectsApi.updateTaskStatus)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<
    "acknowledged" | "inProgress" | "done" | "flagged"
  >("acknowledged")
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium")
  const [dueLabel, setDueLabel] = useState("")
  const [assigneeUserId, setAssigneeUserId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading event ops board"
        body="Convex is syncing event tasks, campus members, and assignment controls."
      />
    )
  }

  const handleCreateTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        await createTask({
          workspaceSlug,
          title,
          description: description || undefined,
          status,
          priority,
          dueLabel: dueLabel || undefined,
          assigneeUserId: assigneeUserId || null,
        })

        setTitle("")
        setDescription("")
        setStatus("acknowledged")
        setPriority("Medium")
        setDueLabel("")
        setAssigneeUserId("")
        toast.success("Event task created")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create event task."
        )
      }
    })
  }

  const handleAssignTask = (taskId: string, nextAssigneeUserId: string) => {
    setPendingTaskId(taskId)

    startTransition(async () => {
      try {
        await assignTask({
          workspaceSlug,
          taskId,
          assigneeUserId: nextAssigneeUserId || null,
        })
        toast.success("Task owner updated")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update assignee."
        )
      } finally {
        setPendingTaskId(null)
      }
    })
  }

  const handleUpdateStatus = (
    taskId: string,
    nextStatus: "acknowledged" | "inProgress" | "done" | "flagged"
  ) => {
    setPendingTaskId(taskId)

    startTransition(async () => {
      try {
        await updateTaskStatus({
          workspaceSlug,
          taskId,
          status: nextStatus,
        })
        toast.success("Task status updated")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update task status."
        )
      } finally {
        setPendingTaskId(null)
      }
    })
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="do-surface p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="do-eyebrow">Event Operations</p>
            <h2 className="do-heading max-w-3xl">
              Give every campus event a live task board instead of a frantic group chat.
            </h2>
            <p className="max-w-2xl do-copy">
              Institute admins can assign ownership, and everyone in the campus can
              keep task state fresh as work gets acknowledged, completed, or flagged.
            </p>
          </div>

          <div className="do-panel p-5">
            <p className="do-stat-label">How This Board Works</p>
            <p className="mt-3 text-[22px] font-medium text-cream">
              {data.canManage
                ? "Create event tasks, assign owners, and keep the room aware of risk."
                : "Task creation and assignment are managed by institute admins."}
            </p>
            <p className="mt-3 text-[13px] leading-6 text-tan">
              Status changes are live for everyone in the campus space, so organizers
              can spot blocked work before event day.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.summary.map((metric, index) => {
          const Icon = statIcons[index] ?? SparklesIcon

          return (
            <div key={metric.label} className="do-card p-5">
              <Icon className="size-4 text-slate" />
              <p className="mt-4 do-stat-label">{metric.label}</p>
              <p className="mt-3 do-stat-value">{metric.value}</p>
              <p className="mt-2 text-[12px] leading-6 text-tan">{metric.detail}</p>
            </div>
          )
        })}
      </section>

      <section className="do-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="do-eyebrow">Create Task</p>
            <h3 className="mt-2 do-subheading">Add new event work to the board</h3>
          </div>
          {!data.canManage ? (
            <span className="do-pill">Institute admins only</span>
          ) : null}
        </div>

        <form onSubmit={handleCreateTask} className="mt-5 grid gap-3 lg:grid-cols-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            disabled={!data.canManage || isPending}
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What needs to happen?"
            disabled={!data.canManage || isPending}
          />
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as "acknowledged" | "inProgress" | "done" | "flagged"
              )
            }
            className={selectClassName}
            disabled={!data.canManage || isPending}
          >
            {statusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as "High" | "Medium" | "Low")
            }
            className={selectClassName}
            disabled={!data.canManage || isPending}
          >
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>
          <Input
            value={dueLabel}
            onChange={(event) => setDueLabel(event.target.value)}
            placeholder="Due label or event checkpoint"
            disabled={!data.canManage || isPending}
          />
          <select
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            className={selectClassName}
            disabled={!data.canManage || isPending}
          >
            <option value="">Unassigned</option>
            {data.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
          <div className="lg:col-span-2">
            <Button type="submit" disabled={!data.canManage || isPending || !title.trim()}>
              <PlusIcon className="size-4" />
              Create event task
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <p className="do-eyebrow">Board View</p>
          <h3 className="mt-2 do-subheading">Live operations across the campus</h3>
        </div>

        {data.columns.some((column) => column.cards.length > 0) ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {data.columns.map((column) => (
              <div
                key={column.id}
                className="do-panel min-w-[320px] max-w-[320px] shrink-0"
              >
                <div className="border-b border-hairline px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[17px] font-medium text-cream">
                        {column.name}
                      </p>
                      <p className="mt-1 text-[11px] tracking-[0.12em] text-tan uppercase">
                        {column.cards.length} cards
                      </p>
                    </div>
                    <span className="do-pill">{statusPill(column.id)}</span>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  {column.cards.map((card) => (
                    <div key={card.id} className="do-card p-4">
                      <p className="text-[15px] font-medium text-cream">{card.title}</p>
                      {card.description ? (
                        <p className="mt-2 text-[12px] leading-6 text-tan">
                          {card.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="do-pill">{card.priority}</span>
                        <span className="do-pill">{card.dueLabel}</span>
                        <span className="do-pill">{statusPill(card.status)}</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        <select
                          value={card.status}
                          onChange={(event) =>
                            handleUpdateStatus(
                              card.id,
                              event.target.value as
                                | "acknowledged"
                                | "inProgress"
                                | "done"
                                | "flagged"
                            )
                          }
                          className={`${selectClassName} w-full`}
                          disabled={isPending && pendingTaskId === card.id}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {data.canManage ? (
                          <select
                            value={card.assigneeUserId ?? ""}
                            onChange={(event) =>
                              handleAssignTask(card.id, event.target.value)
                            }
                            className={`${selectClassName} w-full`}
                            disabled={isPending && pendingTaskId === card.id}
                          >
                            <option value="">Unassigned</option>
                            {data.members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[12px] leading-6 text-tan">
                            {card.assigneeName
                              ? `Owned by ${card.assigneeName}`
                              : "No owner yet"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="do-panel p-6 text-[13px] leading-6 text-tan">
            No event tasks have been created yet. Add the first task above to start
            coordinating setup, volunteer handoff, and showtime execution.
          </div>
        )}
      </section>
    </div>
  )
}
