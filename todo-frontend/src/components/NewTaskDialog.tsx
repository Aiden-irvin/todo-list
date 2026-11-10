import { useState, type FormEvent } from 'react'
import { toIso } from '../utils/dates'
import type { TaskInput } from '../services/api'
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (input: TaskInput) => Promise<void>
}

export default function NewTaskDialog({ open, onClose, onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setError(null)
    onClose()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    if (!title) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title,
        description: String(data.get('description') ?? ''),
        due_date: toIso(String(data.get('due_date') ?? '')),
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="New task" onClose={close}>
      <form onSubmit={submit}>
        <label>
          Title
          <input name="title" maxLength={200} required autoFocus />
        </label>
        <label>
          Description
          <textarea name="description" rows={3} maxLength={5000} />
        </label>
        <label>
          Due date
          <input name="due_date" type="date" />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>Add task</button>
        </div>
      </form>
    </Modal>
  )
}
