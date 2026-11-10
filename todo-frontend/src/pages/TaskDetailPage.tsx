import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Task } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import { toDateInput, toIso } from '../utils/dates'
import { ArrowLeftIcon, TrashIcon } from '../components/icons'

export default function TaskDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const loaded = await api.getTask(id)
        if (active) setTask(loaded)
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : 'Something went wrong')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  const attempt = async (action: () => Promise<void>) => {
    setError(null)
    try {
      await action()
      navigate('/')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong')
    }
  }

  const reopen = async () => {
    setError(null)
    try {
      setTask(await api.updateTask(id, { completed: false }))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong')
    }
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void attempt(async () => {
      await api.updateTask(id, {
        title: String(form.get('title')),
        description: String(form.get('description')),
        completed: form.get('completed') === 'on',
        due_date: toIso(String(form.get('due_date'))),
      })
    })
  }

  return (
    <main className="page narrow">
      <Link to="/" className="back"><ArrowLeftIcon /> Back to tasks</Link>
      <h1>Task details</h1>
      {error && <p role="alert" className="error banner">{error}</p>}
      {task && (
        <form onSubmit={save} className="panel">
          {task.completed && (
            <p className="notice">Completed tasks can't be edited. Reopen the task to make changes.</p>
          )}
          <fieldset disabled={task.completed}>
          <label>
            Title
            <input name="title" defaultValue={task.title} required maxLength={200} />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={task.description} rows={5} maxLength={5000} />
          </label>
          <label>
            Due date
            <input name="due_date" type="date" defaultValue={toDateInput(task.due_date)} />
          </label>
          <label className="check">
            <input name="completed" type="checkbox" defaultChecked={task.completed} />
            Completed
          </label>
          </fieldset>
          <div className="actions spread">
            <button type="button" className="btn danger" onClick={() => setConfirming(true)}>
              <TrashIcon /> Delete
            </button>
            {task.completed ? (
              <button type="button" className="btn primary" onClick={reopen}>Reopen task</button>
            ) : (
              <button type="submit" className="btn primary">Save</button>
            )}
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirming}
        title="Delete task?"
        message={`“${task?.title ?? ''}” will be permanently deleted.`}
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          void attempt(() => api.deleteTask(id))
        }}
      />
    </main>
  )
}
