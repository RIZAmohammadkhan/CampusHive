"use client"

import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  PlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserPlusIcon,
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

const statIcons = [SparklesIcon, UserPlusIcon, TriangleAlertIcon]
const selectClassName =
  "h-10 rounded-2xl border border-hairline bg-field/90 px-3 text-[13px] text-parchment outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
const textareaClassName =
  "min-h-[112px] w-full rounded-[20px] border border-hairline bg-field/90 px-3 py-3 text-[13px] leading-6 text-parchment outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
const statusOptions = [
  { id: "acknowledged", label: "Acknowledged" },
  { id: "inProgress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "flagged", label: "Needs help" },
] as const

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

function TaskComposerModal({
  open,
  canManage,
  eventId,
  setEventId,
  events,
  taskKind,
  setTaskKind,
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
  eventId: string
  setEventId: (value: string) => void
  events: Array<{
    id: string
    title: string
    dateLabel: string
  }>
  taskKind: "assigned" | "volunteer"
  setTaskKind: (value: "assigned" | "volunteer") => void
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
        className="do-surface w-full max-w-3xl p-6 md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="do-eyebrow">New Task</p>
            <h3 className="mt-2 do-subheading">Publish event work</h3>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-tan">
              Attach each task to a campus event, then either assign it directly or
              open it up as a volunteer call.
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3 md:grid-cols-2">
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className={selectClassName}
            disabled={isPending}
          >
            <option value="">Choose an event</option>
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.dateLabel}
              </option>
            ))}
          </select>
          <select
            value={taskKind}
            onChange={(event) =>
              setTaskKind(event.target.value as "assigned" | "volunteer")
            }
            className={selectClassName}
            disabled={isPending}
          >
            <option value="assigned">Assigned task</option>
            <option value="volunteer">Volunteer task</option>
          </select>
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
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should people know before taking this on?"
              className={textareaClassName}
              disabled={isPending}
            />
          </div>
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as
                  | "acknowledged"
                  | "inProgress"
                  | "done"
                  | "flagged"
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
          {taskKind === "assigned" ? (
            <select
              value={assigneeUserId}
              onChange={(event) => setAssigneeUserId(event.target.value)}
              className={selectClassName}
              disabled={isPending}
            >
              <option value="">Assign later</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-[20px] border border-dashed border-hairline bg-surface/55 px-4 py-3 text-[12px] leading-6 text-tan">
              This task will appear as an open volunteer slot until someone claims it.
            </div>
          )}
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-[12px] leading-6 text-tan">
              Organizers can still reassign or update status later from the list.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !eventId || !title.trim()}
              >
                <PlusIcon className="size-4" />
                {isPending ? "Publishing..." : "Add task"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
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
  const volunteerForTask = useMutation(projectsApi.volunteerForTask)
  const completeTask = useMutation(projectsApi.completeTask)
  const updateTaskStatus = useMutation(projectsApi.updateTaskStatus)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [listFilter, setListFilter] = useState<"all" | "open" | "mine" | "volunteer">(
    "all"
  )
  const [eventId, setEventId] = useState("")
  const [taskKind, setTaskKind] = useState<"assigned" | "volunteer">("assigned")
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
  const [completionMessages, setCompletionMessages] = useState<Record<string, string>>({})

  if (data === undefined || data === null) {
    return (
      <LiveLoadingState
        title="Loading tasks"
        body="Syncing event work."
      />
    )
  }

  const tasks = Array.isArray(data.tasks) ? data.tasks : []
  const events = Array.isArray(data.events) ? data.events : []
  const members = Array.isArray(data.members) ? data.members : []
  const summary = Array.isArray(data.summary) ? data.summary : []
  const hasTaskListData = Array.isArray(data.tasks)
  const filteredTasks = tasks.filter((task) => {
    if (listFilter === "open") {
      return task.status !== "done"
    }

    if (listFilter === "mine") {
      return data.currentUserId !== null && task.assigneeUserId === data.currentUserId
    }

    if (listFilter === "volunteer") {
      return task.taskKind === "volunteer" && !task.assigneeUserId
    }

    return true
  })
  const openTaskCount = tasks.filter((task) => task.status !== "done").length
  const myTaskCount = data.currentUserId
    ? tasks.filter((task) => task.assigneeUserId === data.currentUserId).length
    : 0
  const volunteerOpenCount = tasks.filter(
    (task) => task.taskKind === "volunteer" && !task.assigneeUserId
  ).length

  const resetComposer = () => {
    setEventId(events[0]?.id ?? "")
    setTaskKind("assigned")
    setTitle("")
    setDescription("")
    setStatus("acknowledged")
    setPriority("Medium")
    setDueLabel("")
    setAssigneeUserId("")
  }

  const openComposer = () => {
    resetComposer()
    setIsComposerOpen(true)
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
          eventId,
          taskKind,
          title,
          description: description || undefined,
          status,
          priority,
          dueLabel: dueLabel || undefined,
          assigneeUserId: taskKind === "assigned" ? assigneeUserId || null : null,
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

  const handleVolunteer = (taskId: string) => {
    setPendingTaskId(taskId)

    startTransition(async () => {
      try {
        await volunteerForTask({
          workspaceSlug,
          taskId,
        })
        toast.success("You volunteered for this task")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not volunteer for this task."
        )
      } finally {
        setPendingTaskId(null)
      }
    })
  }

  const handleCompleteTask = (taskId: string) => {
    setPendingTaskId(taskId)

    startTransition(async () => {
      try {
        await completeTask({
          workspaceSlug,
          taskId,
          message: completionMessages[taskId]?.trim() || undefined,
        })
        setCompletionMessages((current) => ({
          ...current,
          [taskId]: "",
        }))
        toast.success("Task marked as completed")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to complete task."
        )
      } finally {
        setPendingTaskId(null)
      }
    })
  }

  return (
    <>
      <TaskComposerModal
        open={isComposerOpen}
        canManage={data.canManage}
        eventId={eventId}
        setEventId={setEventId}
        events={events}
        taskKind={taskKind}
        setTaskKind={setTaskKind}
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
        members={members}
        isPending={isPending}
        onClose={closeComposer}
        onSubmit={handleCreateTask}
      />

      <div className="space-y-6 lg:space-y-8">
        <section className="do-surface overflow-hidden p-6">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
            <div>
              <p className="do-eyebrow">Tasks</p>
              <h2 className="mt-2 do-subheading">Event work, in one clear list.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-tan">
                Every task now belongs to a campus event, so organizers can publish
                assignments, ask for volunteers, and keep the event team aligned from
                one place.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="do-pill">
                  <CalendarDaysIcon className="size-3.5" />
                  {events.length} events in filter
                </span>
                <span className="do-pill">
                  <SparklesIcon className="size-3.5" />
                  {filteredTasks.length} tasks visible
                </span>
              </div>
            </div>

            <div className="do-card p-5">
              <p className="do-eyebrow">Organizer tools</p>
              <p className="mt-3 text-[20px] font-medium text-cream">
                {data.canManage ? "Publish assignments and volunteer asks" : "Track event work"}
              </p>
              <p className="mt-3 text-[13px] leading-6 text-tan">
                {data.canManage
                  ? events.length
                    ? "Create work items tied to a specific event, then assign them or leave them open for volunteers."
                    : "Create at least one campus event before publishing tasks."
                  : "Browse the event task list and step up for open volunteer slots when they appear."}
              </p>
              {data.canManage ? (
                <Button
                  className="mt-5 w-full"
                  onClick={openComposer}
                  disabled={!events.length}
                >
                  <PlusIcon className="size-4" />
                  Add task
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {summary.map((metric, index) => {
            const Icon = statIcons[index] ?? SparklesIcon

            return (
              <div key={metric.label} className="do-card p-5">
                <Icon className="size-4 text-slate" />
                <p className="mt-4 do-stat-label">{metric.label}</p>
                <p className="mt-3 do-stat-value">{metric.value}</p>
                <p className="mt-3 text-[12px] leading-6 text-tan">{metric.detail}</p>
              </div>
            )
          })}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="do-eyebrow">Filter</p>
              <h3 className="mt-2 do-subheading">Task list</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={listFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setListFilter("all")}
                >
                  All tasks
                </Button>
                <Button
                  variant={listFilter === "open" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setListFilter("open")}
                >
                  Open tasks · {openTaskCount}
                </Button>
                <Button
                  variant={listFilter === "mine" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setListFilter("mine")}
                >
                  My tasks · {myTaskCount}
                </Button>
                <Button
                  variant={listFilter === "volunteer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setListFilter("volunteer")}
                >
                  Volunteer asks · {volunteerOpenCount}
                </Button>
              </div>
            </div>
          </div>

          {!hasTaskListData ? (
            <div className="do-panel p-6 text-[13px] text-tan">
              This page is waiting for the latest Convex backend shape. Run `npm run convex:dev`
              and refresh.
            </div>
          ) : filteredTasks.length ? (
            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const canEditStatus =
                  data.canManage ||
                  (data.currentUserId !== null &&
                    task.assigneeUserId === data.currentUserId)
                const canMarkComplete =
                  data.currentUserId !== null &&
                  task.assigneeUserId === data.currentUserId &&
                  task.status !== "done"

                return (
                  <div key={task.id} className="do-panel p-5">
                    <button
                      type="button"
                      className="flex w-full items-start gap-4 text-left"
                      onClick={() =>
                        setExpandedTaskId((current) => (current === task.id ? null : task.id))
                      }
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-panel/80 text-[12px] font-medium text-cream">
                        {assigneeInitials(task.assigneeName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-[12px] tracking-[0.14em] text-tan uppercase">
                              {task.eventTitle}
                            </span>
                            <span className="mt-2 block truncate text-[18px] font-medium text-cream">
                              {task.title}
                            </span>
                            <span className="mt-2 block text-[12px] leading-6 text-tan">
                              {task.taskKind === "volunteer"
                                ? task.assigneeName
                                  ? `Volunteer: ${task.assigneeName}`
                                  : "Open for volunteers"
                                : task.assigneeName
                                  ? `Assigned to ${task.assigneeName}`
                                  : "No owner yet"}
                            </span>
                          </span>
                          <ChevronDownIcon
                            className={`mt-1 size-4 shrink-0 text-tan transition-transform ${
                              expandedTaskId === task.id ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                        <span className="mt-4 flex flex-wrap gap-2">
                          <span className="do-pill">{task.eventDateLabel}</span>
                          <span className="do-pill">{task.priority}</span>
                          <span className="do-pill">{task.statusLabel}</span>
                          <span className="do-pill">
                            {task.taskKind === "volunteer" ? "Volunteer" : "Assigned"}
                          </span>
                        </span>
                      </span>
                    </button>

                    {expandedTaskId === task.id ? (
                      <div className="mt-5 border-t border-hairline/80 pt-4">
                        <p className="text-[13px] leading-6 text-tan">
                          {task.description || "No extra notes yet."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="do-pill">{task.dueLabel}</span>
                          <span className="do-pill">
                            <Clock3Icon className="size-3.5" />
                            Updated {formatUpdated(task.updatedAt)}
                          </span>
                          {task.completedAt ? (
                            <span className="do-pill">
                              <CheckCircle2Icon className="size-3.5" />
                              Completed {formatUpdated(task.completedAt)}
                            </span>
                          ) : null}
                        </div>

                        {task.completedAt ? (
                          <div className="mt-4 rounded-[20px] border border-hairline bg-surface/55 p-4">
                            <p className="do-eyebrow">Completion</p>
                            <p className="mt-2 text-[13px] leading-6 text-tan">
                              {task.completedByName
                                ? `${task.completedByName} marked this completed.`
                                : "This task was marked as completed."}
                            </p>
                            {task.completionNote ? (
                              <p className="mt-3 text-[13px] leading-6 text-cream">
                                {task.completionNote}
                              </p>
                            ) : (
                              <p className="mt-3 text-[12px] leading-6 text-tan">
                                No completion note was added.
                              </p>
                            )}
                          </div>
                        ) : null}

                        <div className="mt-4 space-y-3">
                          {canEditStatus ? (
                            <select
                              value={task.status}
                              onChange={(event) =>
                                handleUpdateStatus(
                                  task.id,
                                  event.target.value as
                                    | "acknowledged"
                                    | "inProgress"
                                    | "done"
                                    | "flagged"
                                )
                              }
                              className={`${selectClassName} w-full`}
                              disabled={isPending && pendingTaskId === task.id}
                            >
                              {statusOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : null}

                          {data.canManage ? (
                            <select
                              value={task.assigneeUserId ?? ""}
                              onChange={(event) =>
                                handleAssignTask(task.id, event.target.value)
                              }
                              className={`${selectClassName} w-full`}
                              disabled={isPending && pendingTaskId === task.id}
                            >
                              <option value="">
                                {task.taskKind === "volunteer"
                                  ? "Leave open for volunteers"
                                  : "Unassigned"}
                              </option>
                              {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name} ({member.role})
                                </option>
                              ))}
                            </select>
                          ) : null}

                          {task.canVolunteer ? (
                            <Button
                              onClick={() => handleVolunteer(task.id)}
                              disabled={isPending && pendingTaskId === task.id}
                            >
                              <UserPlusIcon className="size-4" />
                              Volunteer for this task
                            </Button>
                          ) : task.isCurrentUserVolunteer ? (
                            <span className="do-pill">You volunteered for this</span>
                          ) : null}

                          {canMarkComplete ? (
                            <div className="rounded-[20px] border border-hairline bg-surface/55 p-4">
                              <p className="do-eyebrow">Mark complete</p>
                              <p className="mt-2 text-[12px] leading-6 text-tan">
                                Add an optional note so everyone can see what was finished.
                              </p>
                              <textarea
                                value={completionMessages[task.id] ?? ""}
                                onChange={(event) =>
                                  setCompletionMessages((current) => ({
                                    ...current,
                                    [task.id]: event.target.value,
                                  }))
                                }
                                placeholder="Optional completion note"
                                className={`${textareaClassName} mt-3 min-h-[96px]`}
                                disabled={isPending && pendingTaskId === task.id}
                              />
                              <div className="mt-3 flex justify-end">
                                <Button
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={isPending && pendingTaskId === task.id}
                                >
                                  <CheckCircle2Icon className="size-4" />
                                  Mark completed
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="do-panel p-6 text-[13px] text-tan">
              {listFilter === "mine"
                ? "No tasks are currently assigned to you."
                : listFilter === "volunteer"
                  ? "No open volunteer tasks right now."
                  : "No event tasks yet."}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
