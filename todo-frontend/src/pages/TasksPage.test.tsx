import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DragEndEvent } from '@dnd-kit/core'
import { act } from '@testing-library/react'
import { api, ApiError, tokenStore } from '../services/api'
import { makeTask, renderApp } from '../test/utils'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  api: {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    reorder: vi.fn(),
  },
}))

const dnd = vi.hoisted(() => ({ onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined }))

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      dnd.onDragEnd = props.onDragEnd
      return <actual.DndContext {...props} />
    },
  }
})

const drag = (activeId: number, overId: number) =>
  act(() => dnd.onDragEnd?.({ active: { id: activeId }, over: { id: overId } } as unknown as DragEndEvent))

const tasks = [
  makeTask({ id: 1, title: 'Buy milk', position: 0 }),
  makeTask({ id: 2, title: 'Write report', description: 'quarterly numbers', position: 1 }),
  makeTask({ id: 3, title: 'Call mom', position: 2 }),
]

const titles = () => screen.getAllByRole('listitem').map((item) => within(item).getAllByRole('link')[0].textContent)

beforeEach(() => {
  vi.resetAllMocks()
  tokenStore.set('tok')
  vi.mocked(api.listTasks).mockResolvedValue(tasks)
})

describe('tasks page', () => {
  it('lists the user\'s tasks in order', async () => {
    renderApp()
    await screen.findByText('Buy milk')
    expect(titles()).toEqual(['Buy milk', 'Write report', 'Call mom'])
  })

  it('shows an empty state', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([])
    renderApp()
    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('shows an error when loading fails', async () => {
    vi.mocked(api.listTasks).mockRejectedValue(new ApiError(500, 'Server down'))
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down')
  })

  it('creates a task and appends it', async () => {
    vi.mocked(api.createTask).mockResolvedValue(makeTask({ id: 4, title: 'New one', position: 3 }))
    renderApp()
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /new task/i }))
    const dialog = screen.getByRole('dialog', { name: /new task/i })
    await userEvent.type(within(dialog).getByLabelText(/title/i), 'New one')
    await userEvent.type(within(dialog).getByLabelText(/description/i), 'Some details')
    await userEvent.type(within(dialog).getByLabelText(/due date/i), '2026-03-05')
    await userEvent.click(within(dialog).getByRole('button', { name: /add task/i }))
    expect(api.createTask).toHaveBeenCalledWith({
      title: 'New one',
      description: 'Some details',
      due_date: '2026-03-05T00:00:00Z',
    })
    expect(await screen.findByText('New one')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancels task creation from the modal', async () => {
    renderApp()
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /new task/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.createTask).not.toHaveBeenCalled()
  })

  it('keeps the modal open and shows the error when creation fails', async () => {
    vi.mocked(api.createTask).mockRejectedValue(new ApiError(422, 'Title cannot be blank'))
    renderApp()
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /new task/i }))
    await userEvent.type(screen.getByLabelText(/title/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: /add task/i }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Title cannot be blank')
  })

  it('creates a task with only a title', async () => {
    vi.mocked(api.createTask).mockResolvedValue(makeTask({ id: 4, title: 'Bare' }))
    renderApp()
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /new task/i }))
    await userEvent.type(screen.getByLabelText(/title/i), 'Bare')
    await userEvent.click(screen.getByRole('button', { name: /add task/i }))
    expect(api.createTask).toHaveBeenCalledWith({ title: 'Bare', description: '', due_date: null })
  })

  it('shows description and due date on the row', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([
      makeTask({ id: 9, title: 'Dated', description: 'Details here', due_date: '2026-03-05T00:00:00' }),
    ])
    renderApp()
    expect(await screen.findByText('Details here')).toBeInTheDocument()
    expect(screen.getByText(/2026-03-05/)).toBeInTheDocument()
  })

  it('does not allow editing a completed task from the list', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([makeTask({ id: 5, title: 'Done thing', completed: true })])
    renderApp()
    expect(await screen.findByRole('button', { name: /edit done thing/i })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /edit done thing/i })).not.toBeInTheDocument()
  })

  it('offers an edit link on every open row', async () => {
    renderApp()
    expect(await screen.findByRole('link', { name: /edit write report/i })).toHaveAttribute('href', '/tasks/2')
  })

  it('toggles completion', async () => {
    vi.mocked(api.updateTask).mockResolvedValue({ ...tasks[0], completed: true })
    renderApp()
    await userEvent.click(await screen.findByRole('checkbox', { name: /buy milk/i }))
    expect(api.updateTask).toHaveBeenCalledWith(1, { completed: true })
    expect(await screen.findByRole('checkbox', { name: /buy milk/i })).toBeChecked()
  })

  it('deletes a task after confirmation', async () => {
    vi.mocked(api.deleteTask).mockResolvedValue()
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: /delete call mom/i }))
    expect(api.deleteTask).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: /delete task/i })
    expect(dialog).toHaveTextContent('Call mom')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(api.deleteTask).toHaveBeenCalledWith(3)
    expect(screen.queryByText('Call mom')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the task when deletion is cancelled', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: /delete call mom/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(api.deleteTask).not.toHaveBeenCalled()
    expect(screen.getByText('Call mom')).toBeInTheDocument()
  })

  describe('filters and progress', () => {
    const mixed = [
      makeTask({ id: 1, title: 'Open one', position: 0 }),
      makeTask({ id: 2, title: 'Finished one', completed: true, position: 1 }),
      makeTask({ id: 3, title: 'Open two', position: 2 }),
      makeTask({ id: 4, title: 'Finished two', completed: true, position: 3 }),
    ]
    beforeEach(() => vi.mocked(api.listTasks).mockResolvedValue(mixed))

    it('shows the completion percentage across every filter', async () => {
      renderApp()
      await screen.findByText('Open one')
      expect(screen.getByRole('button', { name: /^all/i })).toHaveAttribute('aria-pressed', 'true')
      expect(titles()).toHaveLength(4)
      expect(screen.getByRole('progressbar', { name: /progress/i })).toHaveAttribute('aria-valuenow', '50')
      expect(screen.getByText('2 of 4 done · 50%')).toBeInTheDocument()
    })

    it('rounds the percentage', async () => {
      vi.mocked(api.listTasks).mockResolvedValue([mixed[1], mixed[0], mixed[2]])
      renderApp()
      expect(await screen.findByText('1 of 3 done · 33%')).toBeInTheDocument()
    })

    it('filters to in-progress tasks', async () => {
      renderApp()
      await screen.findByText('Open one')
      await userEvent.click(screen.getByRole('button', { name: /in progress/i }))
      expect(titles()).toEqual(['Open one', 'Open two'])
      expect(screen.getByRole('progressbar', { name: /progress/i })).toHaveAttribute('aria-valuenow', '50')
    })

    it('filters to completed tasks', async () => {
      renderApp()
      await screen.findByText('Open one')
      await userEvent.click(screen.getByRole('button', { name: /completed/i }))
      expect(titles()).toEqual(['Finished one', 'Finished two'])
      expect(screen.getByText('2 of 4 done · 50%')).toBeInTheDocument()
    })

    it('shows counts on the filter buttons', async () => {
      renderApp()
      await screen.findByText('Open one')
      expect(screen.getByRole('button', { name: /in progress/i })).toHaveTextContent('2')
      expect(screen.getByRole('button', { name: /completed/i })).toHaveTextContent('2')
      expect(screen.getByRole('button', { name: /^all/i })).toHaveTextContent('4')
    })

    it('combines a filter with search', async () => {
      renderApp()
      await screen.findByText('Open one')
      await userEvent.click(screen.getByRole('button', { name: /completed/i }))
      await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'two')
      expect(titles()).toEqual(['Finished two'])
    })

    it('shows a filter-specific empty state', async () => {
      vi.mocked(api.listTasks).mockResolvedValue([mixed[0]])
      renderApp()
      await screen.findByText('Open one')
      await userEvent.click(screen.getByRole('button', { name: /completed/i }))
      expect(screen.getByText(/no completed tasks/i)).toBeInTheDocument()
    })

    it('moves a task out of in-progress when it is completed', async () => {
      vi.mocked(api.updateTask).mockResolvedValue({ ...mixed[0], completed: true })
      renderApp()
      await screen.findByText('Open one')
      await userEvent.click(screen.getByRole('button', { name: /in progress/i }))
      await userEvent.click(screen.getByRole('checkbox', { name: /open one/i }))
      expect(titles()).toEqual(['Open two'])
    })

    it('disables dragging while a filter is active', async () => {
      renderApp()
      await screen.findByText('Open one')
      await userEvent.click(screen.getByRole('button', { name: /in progress/i }))
      expect(screen.getByRole('button', { name: /drag open one/i })).toBeDisabled()
    })
  })

  it('searches titles and descriptions', async () => {
    renderApp()
    await screen.findByText('Buy milk')
    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'QUARTERLY')
    expect(titles()).toEqual(['Write report'])
    await userEvent.clear(screen.getByRole('searchbox', { name: /search/i }))
    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'zzz')
    expect(screen.getByText(/no matching tasks/i)).toBeInTheDocument()
  })

  it('reorders by dragging and persists the full id order', async () => {
    vi.mocked(api.reorder).mockResolvedValue([])
    renderApp()
    await screen.findByText('Buy milk')
    drag(1, 3)
    expect(titles()).toEqual(['Write report', 'Call mom', 'Buy milk'])
    expect(api.reorder).toHaveBeenCalledWith([2, 3, 1])
  })

  it('ignores drops that do not change the order', async () => {
    renderApp()
    await screen.findByText('Buy milk')
    drag(1, 1)
    act(() => dnd.onDragEnd?.({ active: { id: 1 }, over: null } as unknown as DragEndEvent))
    expect(api.reorder).not.toHaveBeenCalled()
  })

  it('exposes a drag handle per row', async () => {
    renderApp()
    expect(await screen.findByRole('button', { name: /drag buy milk/i })).toBeEnabled()
  })

  it('disables dragging while a search is active', async () => {
    renderApp()
    await screen.findByText('Buy milk')
    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'o')
    expect(screen.getByRole('button', { name: /drag write report/i })).toBeDisabled()
  })

  it('rolls back the order when saving fails', async () => {
    vi.mocked(api.reorder).mockRejectedValue(new ApiError(400, 'Nope'))
    renderApp()
    await screen.findByText('Buy milk')
    drag(1, 2)
    expect(await screen.findByRole('alert')).toHaveTextContent('Nope')
    expect(titles()).toEqual(['Buy milk', 'Write report', 'Call mom'])
  })

  it('signs out', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(tokenStore.get()).toBeNull()
  })
})
