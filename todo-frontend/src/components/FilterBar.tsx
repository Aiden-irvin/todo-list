import type { Task } from '../services/api'
import { FILTERS, type Filter } from '../utils/filters'

interface Props {
  tasks: Task[]
  value: Filter
  onChange: (filter: Filter) => void
}

export default function FilterBar({ tasks, value, onChange }: Props) {
  return (
    <div className="filters" role="group" aria-label="Filter tasks">
      {FILTERS.map(({ key, label, matches }) => (
        <button
          key={key}
          type="button"
          className={`filter${key === value ? ' active' : ''}`}
          aria-pressed={key === value}
          onClick={() => onChange(key)}
        >
          {label} <span className="count">{tasks.filter(matches).length}</span>
        </button>
      ))}
    </div>
  )
}
