import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import type { Task } from '../services/api'
import { toDateInput } from '../utils/dates'
import { CalendarIcon, EditIcon, GripIcon, TrashIcon } from './icons'

interface Props {
  task: Task
  dragDisabled: boolean
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
}

export default function TaskRow({ task, dragDisabled, onToggle, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`task${task.completed ? ' done' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button
        type="button"
        className="icon-btn handle"
        aria-label={`Drag ${task.title} to reorder`}
        disabled={dragDisabled}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <input
        type="checkbox"
        checked={task.completed}
        aria-label={`Mark ${task.title} complete`}
        onChange={() => onToggle(task)}
      />
      <div className="task-main">
        <Link to={`/tasks/${task.id}`} className="task-title">{task.title}</Link>
        {task.description && <p className="task-desc">{task.description}</p>}
        {task.due_date && (
          <p className="chip"><CalendarIcon size={14} /> Due {toDateInput(task.due_date)}</p>
        )}
      </div>
      {task.completed ? (
        <button type="button" className="icon-btn" aria-label={`Edit ${task.title}`} title="Reopen the task to edit it" disabled>
          <EditIcon />
        </button>
      ) : (
        <Link to={`/tasks/${task.id}`} className="icon-btn" aria-label={`Edit ${task.title}`}><EditIcon /></Link>
      )}
      <button type="button" className="icon-btn danger" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)}>
        <TrashIcon />
      </button>
    </li>
  )
}
