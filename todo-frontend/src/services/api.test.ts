import { api, ApiError, tokenStore } from './api'

const respond = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  tokenStore.clear()
})

describe('api', () => {
  it('logs in and returns the token response', async () => {
    fetchMock.mockResolvedValue(respond(200, { access_token: 't', user: { id: 1 } }))
    const result = await api.login('a@b.co', 'password1')
    expect(result.access_token).toBe('t')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/auth\/login$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'password1' })
  })

  it('sends the bearer token on authenticated calls', async () => {
    tokenStore.set('secret')
    fetchMock.mockResolvedValue(respond(200, []))
    await api.listTasks()
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret')
  })

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(respond(204))
    await expect(api.deleteTask(3)).resolves.toBeUndefined()
  })

  it('reorders with the full id list', async () => {
    fetchMock.mockResolvedValue(respond(200, []))
    await api.reorder([2, 1])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/tasks\/reorder$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ task_ids: [2, 1] })
  })

  it('uses a string detail as the error message', async () => {
    fetchMock.mockResolvedValue(respond(409, { detail: 'Email already registered' }))
    await expect(api.register('n', 'a@b.co', 'password1')).rejects.toMatchObject({
      status: 409,
      message: 'Email already registered',
    })
  })

  it('joins validation error details (422) into one message', async () => {
    fetchMock.mockResolvedValue(
      respond(422, { detail: [{ msg: 'Field required' }, { msg: 'Too short' }] }),
    )
    await expect(api.createTask({ title: '' })).rejects.toThrow('Field required; Too short')
  })

  it('clears the token and notifies on 401', async () => {
    tokenStore.set('expired')
    const listener = vi.fn()
    const off = tokenStore.onUnauthorized(listener)
    fetchMock.mockResolvedValue(respond(401, { detail: 'Invalid token' }))
    await expect(api.listTasks()).rejects.toBeInstanceOf(ApiError)
    expect(tokenStore.get()).toBeNull()
    expect(listener).toHaveBeenCalledOnce()
    off()
  })

  it('does not treat a failed login as an expired session', async () => {
    const listener = vi.fn()
    tokenStore.onUnauthorized(listener)
    fetchMock.mockResolvedValue(respond(401, { detail: 'Incorrect email or password' }))
    await expect(api.login('a@b.co', 'x')).rejects.toThrow('Incorrect email or password')
    expect(listener).not.toHaveBeenCalled()
  })

  it('reports an unreachable server with a readable message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.login('a@b.co', 'x')).rejects.toThrow(/can't reach the server/i)
  })
})
