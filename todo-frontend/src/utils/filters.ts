import type { Task } from '../services/api'

export type Filter = 'all' | 'active' | 'completed'

export const FILTERS: { key: Filter; label: string; matches: (task: Task) => boolean }[] = [
  { key: 'all', label: 'All', matches: () => true },
  { key: 'active', label: 'In progress', matches: (task) => !task.completed },
  { key: 'completed', label: 'Completed', matches: (task) => task.completed },
]

export const EMPTY_MESSAGES: Record<Filter, string> = {
  all: 'No tasks yet — add your first one.',
  active: 'No tasks in progress.',
  completed: 'No completed tasks yet.',
}

export const percentDone = (tasks: Task[]) =>
  tasks.length === 0 ? 0 : Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)
