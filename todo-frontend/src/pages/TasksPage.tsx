import { useEffect, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { api, type Task, type TaskInput } from '../services/api'
import { useAuth } from '../context/auth'
import ConfirmDialog from '../components/ConfirmDialog'
import FilterBar from '../components/FilterBar'
import { EMPTY_MESSAGES, FILTERS, percentDone, type Filter } from '../utils/filters'
import { LogOutIcon, PlusIcon, SearchIcon, CheckCircleIcon } from '../components/icons'
import NewTaskDialog from '../components/NewTaskDialog'
import TaskRow from '../components/TaskRow'

const matches = (task: Task, query: string) =>
  `${task.title} ${task.description}`.toLowerCase().includes(query.trim().toLowerCase())

const messageOf = (failure: unknown) => (failure instanceof Error ? failure.message : 'Something went wrong')

export default function TasksPage() {
  const { signOut } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const loaded = await api.listTasks()
        if (active) setTasks(loaded)
      } catch (failure) {
        if (active) {
          setError(messageOf(failure))
          setTasks([])
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const attempt = async (action: () => Promise<void>) => {
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(messageOf(failure))
    }
  }

  const replace = (updated: Task) =>
    setTasks((current) => current?.map((task) => (task.id === updated.id ? updated : task)) ?? null)

  const create = async (input: TaskInput) => {
    const created = await api.createTask(input)
    setTasks((current) => [...(current ?? []), created])
    setCreating(false)
  }

  const toggle = (task: Task) =>
    attempt(async () => replace(await api.updateTask(task.id, { completed: !task.completed })))

  const confirmDelete = () => {
    const task = pendingDelete
    setPendingDelete(null)
    if (!task) return
    void attempt(async () => {
      await api.deleteTask(task.id)
      setTasks((current) => current?.filter(({ id }) => id !== task.id) ?? null)
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!tasks || !over || active.id === over.id) return
    const previous = tasks
    const reordered = arrayMove(
      tasks,
      tasks.findIndex(({ id }) => id === active.id),
      tasks.findIndex(({ id }) => id === over.id),
    )
    setTasks(reordered)
    void attempt(async () => {
      try {
        await api.reorder(reordered.map(({ id }) => id))
      } catch (failure) {
        setTasks(previous)
        throw failure
      }
    })
  }

  const filterMatches = FILTERS.find(({ key }) => key === filter)?.matches ?? (() => true)
  const visible = tasks?.filter((task) => filterMatches(task) && matches(task, query)) ?? []
  const narrowed = filter !== 'all' || query.trim() !== ''
  const percent = percentDone(tasks ?? [])
  const doneCount = tasks?.filter(({ completed }) => completed).length ?? 0

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>My tasks</h1>
        </div>
        <button type="button" className="btn" onClick={signOut}>
          <LogOutIcon /> Sign out
        </button>
      </header>
      {error && <p role="alert" className="error banner">{error}</p>}
      {tasks && tasks.length > 0 && (
        <section className="progress" aria-label="Progress">
          <div className="progress-text">
            <span>Overall progress</span>
            <strong>{doneCount} of {tasks.length} done · {percent}%</strong>
          </div>
          <div
            className="bar-track"
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="bar-fill" style={{ width: `${percent}%` }} />
          </div>
        </section>
      )}
      {tasks && <FilterBar tasks={tasks} value={filter} onChange={setFilter} />}
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search tasks</span>
          <SearchIcon />
          <input type="search" placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="button" className="btn primary" onClick={() => setCreating(true)}>
          <PlusIcon /> New task
        </button>
      </div>
      {tasks && visible.length === 0 && (
        <div className="empty">
          <CheckCircleIcon size={40} />
          <p>{tasks.length > 0 && narrowed && (query.trim() !== '' || filter === 'all') ? 'No matching tasks.' : EMPTY_MESSAGES[filter]}</p>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <ul className="tasks">
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} dragDisabled={narrowed} onToggle={toggle} onDelete={setPendingDelete} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <NewTaskDialog open={creating} onClose={() => setCreating(false)} onSubmit={create} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete task?"
        message={`“${pendingDelete?.title ?? ''}” will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  )
}
