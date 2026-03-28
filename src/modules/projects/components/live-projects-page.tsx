"use client"

import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import {
  ChevronDownIcon,
  Clock3Icon,
  PlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
  XIcon,
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

function TaskComposerModal({
  open,
  canManage,
  title,
  setTitle,
  description,
  setDescription,
  status,
  setStatus,
  priority,
  setPriority,
  dueLabel,
  setDueLabel,
  assigneeUserId,
  setAssigneeUserId,
  members,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean
  canManage: boolean
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  status: "acknowledged" | "inProgress" | "done" | "flagged"
  setStatus: (value: "acknowledged" | "inProgress" | "done" | "flagged") => void
  priority: "High" | "Medium" | "Low"
  setPriority: (value: "High" | "Medium" | "Low") => void
  dueLabel: string
  setDueLabel: (value: string) => void
  assigneeUserId: string
  setAssigneeUserId: (value: string) => void
  members: Array<{
    id: string
    name: string
    role: "admin" | "member"
  }>
  isPending: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  if (!open || !canManage) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="do-surface w-full max-w-2xl p-6 md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="do-eyebrow">New Task</p>
            <h3 className="mt-2 do-subheading">Add work to Tasks</h3>
            <p className="mt-3 max-w-xl text-[13px] leading-6 text-tan">
              Create a task, set the current status, and assign an owner if one is already clear.
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="md:col-span-2">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What needs to happen?"
              disabled={isPending}
            />
          </div>
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as "acknowledged" | "inProgress" | "done" | "flagged"
              )
            }
            className={selectClassName}
            disabled={isPending}
          >
            {statusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as "High" | "Medium" | "Low")}
            className={selectClassName}
            disabled={isPending}
          >
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>
          <Input
            value={dueLabel}
            onChange={(event) => setDueLabel(event.target.value)}
            placeholder="Due label or checkpoint"
            disabled={isPending}
          />
          <select
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            className={selectClassName}
            disabled={isPending}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-[12px] leading-6 text-tan">
              Tasks support title, notes, status, priority, due label, and assignee.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !title.trim()}>
                <PlusIcon className="size-4" />
                {isPending ? "Creating..." : "Add task"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function statusPill(status: (typeof statusOptions)[number]["id"]) {
  if (status === "acknowledged") return "Ready"
  if (status === "inProgress") return "Live"
  if (status === "done") return "Done"
  return "Blocked"
}

function formatUpdated(timestamp: number | null) {
  if (!timestamp) {
    return "Not updated yet"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

function assigneeInitials(name: string | null) {
  const value = name?.trim() ?? ""

  if (!value) {
    return "?"
  }

  const words = value.split(/\s+/).filter(Boolean).slice(0, 2)
  return words.map((word) => word.charAt(0).toUpperCase()).join("")
}

export function LiveProjectsPage({ workspaceSlug }: { workspaceSlug: string }) {
  const enabled = useConvexConfigured()

  if (!enabled) {
    return (
      <ConvexSetupNotice
        title="Tasks need Convex."
        body="Add your deployment URL and run Convex to load the board."
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
  const [isComposerOpen, setIsComposerOpen] = useState(false)
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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading tasks"
        body="Syncing the board."
      />
    )
  }

  const resetComposer = () => {
    setTitle("")
    setDescription("")
    setStatus("acknowledged")
    setPriority("Medium")
    setDueLabel("")
    setAssigneeUserId("")
  }

  const closeComposer = () => {
    if (isPending) {
      return
    }

    setIsComposerOpen(false)
  }

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
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

        resetComposer()
        setIsComposerOpen(false)
        toast.success("Task created")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create task."
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

  const flaggedCount =
    data.columns.find((column) => column.id === "flagged")?.cards.length ?? 0

  return (
    <>
      <TaskComposerModal
        open={isComposerOpen}
        canManage={data.canManage}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        status={status}
        setStatus={setStatus}
        priority={priority}
        setPriority={setPriority}
        dueLabel={dueLabel}
        setDueLabel={setDueLabel}
        assigneeUserId={assigneeUserId}
        setAssigneeUserId={setAssigneeUserId}
        members={data.members}
        isPending={isPending}
        onClose={closeComposer}
        onSubmit={handleCreateTask}
      />

      <div className="space-y-6 lg:space-y-8">
        <section className="do-surface overflow-hidden p-6">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <div>
              <p className="do-eyebrow">Tasks</p>
              <h2 className="mt-2 do-subheading">Work in one board.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-tan">
                Track ownership, progress, and blockers for the work behind each event.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="do-pill">
                  <SparklesIcon className="size-3.5" />
                  {data.summary[0]?.value ?? "00"} open
                </span>
                <span className="do-pill">
                  <TriangleAlertIcon className="size-3.5" />
                  {flaggedCount} blocked
                </span>
              </div>
            </div>

            <div className="do-card p-5">
              <p className="do-eyebrow">Task flow</p>
              <p className="mt-3 text-[20px] font-medium text-cream">
                {data.canManage ? "Create and assign work" : "Track active work"}
              </p>
              <p className="mt-3 text-[13px] leading-6 text-tan">
                {data.canManage
                  ? "Add tasks, set status, and hand off ownership from one place."
                  : "View progress and update task status as work moves forward."}
              </p>
              {data.canManage ? (
                <Button className="mt-5 w-full" onClick={() => setIsComposerOpen(true)}>
                  <PlusIcon className="size-4" />
                  Add task
                </Button>
              ) : null}
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
              </div>
            )
          })}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="do-eyebrow">Board</p>
              <h3 className="mt-2 do-subheading">Current tasks</h3>
            </div>
            {!data.canManage ? (
              <span className="do-pill">Only campus admins can add tasks</span>
            ) : null}
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
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 text-left"
                          onClick={() =>
                            setExpandedTaskId((current) =>
                              current === card.id ? null : card.id
                            )
                          }
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] font-medium text-cream">
                            {assigneeInitials(card.assigneeName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block truncate text-[15px] font-medium text-cream">
                                  {card.title}
                                </span>
                                <span className="mt-1 block text-[12px] leading-6 text-tan">
                                  {card.assigneeName
                                    ? `Assigned to ${card.assigneeName}`
                                    : "Unassigned"}
                                </span>
                              </span>
                              <ChevronDownIcon
                                className={`mt-1 size-4 shrink-0 text-tan transition-transform ${
                                  expandedTaskId === card.id ? "rotate-180" : ""
                                }`}
                              />
                            </span>
                            <span className="mt-3 flex flex-wrap gap-2">
                              <span className="do-pill">{card.priority}</span>
                              <span className="do-pill">{statusPill(card.status)}</span>
                            </span>
                          </span>
                        </button>

                        {expandedTaskId === card.id ? (
                          <div className="mt-4 border-t border-hairline/80 pt-4">
                            {card.description ? (
                              <p className="text-[12px] leading-6 text-tan">
                                {card.description}
                              </p>
                            ) : (
                              <p className="text-[12px] leading-6 text-tan">
                                No extra notes.
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="do-pill">{card.dueLabel}</span>
                              <span className="do-pill">Updated {formatUpdated(card.updatedAt)}</span>
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
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="do-panel p-6 text-[13px] text-tan">
              No tasks yet.
            </div>
          )}
        </section>
      </div>
    </>
  )
}
