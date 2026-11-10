export interface User {
  id: number
  name: string
  email: string
}

export interface Task {
  id: number
  title: string
  description: string
  completed: boolean
  position: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export type TaskInput = Partial<Pick<Task, 'title' | 'description' | 'completed' | 'due_date'>>

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'todo.token'
const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const unauthorizedListeners = new Set<() => void>()

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  onUnauthorized(listener: () => void) {
    unauthorizedListeners.add(listener)
    return () => void unauthorizedListeners.delete(listener)
  },
}

// FastAPI sends `detail` as a string (401/404/409) or a list of {msg} (422).
const errorMessage = (detail: unknown, fallback: string): string =>
  typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? detail.map(({ msg }: { msg: string }) => msg).join('; ')
      : fallback

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const token = tokenStore.get()
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(auth && token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running and try again.")
  }
  if (response.status === 204) return undefined as T
  let data: { detail?: unknown } = {}
  try {
    data = await response.json()
  } catch {
    // Non-JSON error body (e.g. proxy page): fall back to the status text below.
  }
  if (!response.ok) {
    if (response.status === 401 && auth) {
      tokenStore.clear()
      unauthorizedListeners.forEach((listener) => listener())
    }
    throw new ApiError(response.status, errorMessage(data.detail, response.statusText || 'Request failed'))
  }
  return data as T
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', { email, password }, false),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/register', { name, email, password }, false),
  listTasks: () => request<Task[]>('GET', '/tasks'),
  getTask: (id: number) => request<Task>('GET', `/tasks/${id}`),
  createTask: (input: TaskInput) => request<Task>('POST', '/tasks', input),
  updateTask: (id: number, input: TaskInput) => request<Task>('PATCH', `/tasks/${id}`, input),
  deleteTask: (id: number) => request<void>('DELETE', `/tasks/${id}`),
  reorder: (ids: number[]) => request<Task[]>('PUT', '/tasks/reorder', { task_ids: ids }),
}
