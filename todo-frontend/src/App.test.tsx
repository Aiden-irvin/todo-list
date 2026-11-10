import { screen } from '@testing-library/react'
import { tokenStore } from './services/api'
import { renderApp } from './test/utils'

it('returns to sign-in when the server rejects an expired token', async () => {
  tokenStore.set('expired')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"Invalid token"}', { status: 401 })))
  renderApp('/')
  expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  expect(tokenStore.get()).toBeNull()
})
