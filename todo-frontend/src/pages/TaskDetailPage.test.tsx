import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api, ApiError, tokenStore } from '../services/api'
import { makeTask, renderApp } from '../test/utils'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  api: { getTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), listTasks: vi.fn() },
}))

const task = makeTask({ id: 7, title: 'Plan trip', description: 'Book flights', due_date: '2026-03-05T00:00:00Z' })

beforeEach(() => {
  vi.resetAllMocks()
  tokenStore.set('tok')
  vi.mocked(api.getTask).mockResolvedValue(task)
  vi.mocked(api.listTasks).mockResolvedValue([task])
})

describe('task detail page', () => {
  it('shows the task fields', async () => {
    renderApp('/tasks/7')
    expect(await screen.findByLabelText(/title/i)).toHaveValue('Plan trip')
    expect(screen.getByLabelText(/description/i)).toHaveValue('Book flights')
    expect(screen.getByLabelText(/due date/i)).toHaveValue('2026-03-05')
    expect(screen.getByLabelText(/completed/i)).not.toBeChecked()
  })

  it('saves edits and returns to the list', async () => {
    vi.mocked(api.updateTask).mockResolvedValue({ ...task, title: 'Plan holiday' })
    renderApp('/tasks/7')
    const title = await screen.findByLabelText(/title/i)
    await userEvent.clear(title)
    await userEvent.type(title, 'Plan holiday')
    await userEvent.click(screen.getByLabelText(/completed/i))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(api.updateTask).toHaveBeenCalledWith(7, {
      title: 'Plan holiday',
      description: 'Book flights',
      completed: true,
      due_date: '2026-03-05T00:00:00Z',
    })
    expect(await screen.findByRole('heading', { name: /my tasks/i })).toBeInTheDocument()
  })

  it('clears the due date', async () => {
    vi.mocked(api.updateTask).mockResolvedValue(task)
    renderApp('/tasks/7')
    await userEvent.clear(await screen.findByLabelText(/due date/i))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(api.updateTask).toHaveBeenCalledWith(7, expect.objectContaining({ due_date: null }))
  })

  it('shows a save error and stays on the page', async () => {
    vi.mocked(api.updateTask).mockRejectedValue(new ApiError(422, 'Title cannot be blank'))
    renderApp('/tasks/7')
    await userEvent.click(await screen.findByRole('button', { name: /save/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Title cannot be blank')
  })

  it('deletes the task and returns to the list', async () => {
    vi.mocked(api.deleteTask).mockResolvedValue()
    renderApp('/tasks/7')
    await userEvent.click(await screen.findByRole('button', { name: /delete/i }))
    expect(api.deleteTask).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.deleteTask).toHaveBeenCalledWith(7)
    expect(await screen.findByRole('heading', { name: /my tasks/i })).toBeInTheDocument()
  })

  it('shows a not-found state', async () => {
    vi.mocked(api.getTask).mockRejectedValue(new ApiError(404, 'Task not found'))
    renderApp('/tasks/99')
    expect(await screen.findByRole('alert')).toHaveTextContent('Task not found')
    expect(screen.getByRole('link', { name: /back to tasks/i })).toHaveAttribute('href', '/')
  })

  it('links back to the list', async () => {
    renderApp('/tasks/7')
    await userEvent.click(await screen.findByRole('link', { name: /back to tasks/i }))
    expect(await screen.findByRole('heading', { name: /my tasks/i })).toBeInTheDocument()
  })

  describe('completed task', () => {
    const done = { ...task, completed: true }
    beforeEach(() => vi.mocked(api.getTask).mockResolvedValue(done))

    it('is read-only', async () => {
      renderApp('/tasks/7')
      expect(await screen.findByLabelText(/title/i)).toBeDisabled()
      expect(screen.getByLabelText(/description/i)).toBeDisabled()
      expect(screen.getByLabelText(/due date/i)).toBeDisabled()
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
      expect(screen.getByText(/completed tasks can.t be edited/i)).toBeInTheDocument()
    })

    it('becomes editable after reopening', async () => {
      vi.mocked(api.updateTask).mockResolvedValue(task)
      renderApp('/tasks/7')
      await userEvent.click(await screen.findByRole('button', { name: /reopen task/i }))
      expect(api.updateTask).toHaveBeenCalledWith(7, { completed: false })
      expect(await screen.findByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeEnabled()
    })

    it('shows an error if reopening fails', async () => {
      vi.mocked(api.updateTask).mockRejectedValue(new ApiError(500, 'Server down'))
      renderApp('/tasks/7')
      await userEvent.click(await screen.findByRole('button', { name: /reopen task/i }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Server down')
      expect(screen.getByLabelText(/title/i)).toBeDisabled()
    })

    it('can still be deleted', async () => {
      renderApp('/tasks/7')
      expect(await screen.findByRole('button', { name: /^delete/i })).toBeEnabled()
    })
  })
})
