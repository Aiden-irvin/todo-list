import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api, ApiError, tokenStore } from '../services/api'
import { renderApp } from '../test/utils'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  api: { login: vi.fn(), register: vi.fn(), listTasks: vi.fn().mockResolvedValue([]) },
}))

const session = { access_token: 'tok', user: { id: 1, name: 'Ann', email: 'a@b.co' } }

beforeEach(() => {
  vi.clearAllMocks()
  tokenStore.clear()
})

describe('sign in', () => {
  it('redirects unauthenticated visitors to the sign-in page', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('signs in and shows the task list', async () => {
    vi.mocked(api.login).mockResolvedValue(session)
    renderApp('/signin')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'password1')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('heading', { name: /my tasks/i })).toBeInTheDocument()
    expect(api.login).toHaveBeenCalledWith('a@b.co', 'password1')
    expect(tokenStore.get()).toBe('tok')
  })

  it('shows the server error when credentials are wrong', async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiError(401, 'Incorrect email or password'))
    renderApp('/signin')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
  })

  it('creates an account from the register mode', async () => {
    vi.mocked(api.register).mockResolvedValue(session)
    renderApp('/signin')
    await userEvent.click(screen.getByRole('button', { name: /create an account/i }))
    await userEvent.type(screen.getByLabelText(/name/i), 'Ann')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'password1')
    await userEvent.click(screen.getByRole('button', { name: /^create account$/i }))
    await waitFor(() => expect(api.register).toHaveBeenCalledWith('Ann', 'a@b.co', 'password1'))
    expect(await screen.findByRole('heading', { name: /my tasks/i })).toBeInTheDocument()
  })
})
