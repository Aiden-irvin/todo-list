import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import type { Task } from '../services/api'

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Task',
  description: '',
  completed: false,
  position: 0,
  due_date: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const renderApp = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
