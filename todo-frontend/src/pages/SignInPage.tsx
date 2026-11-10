import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { CheckCircleIcon } from '../components/icons'

export default function SignInPage() {
  const { isAuthenticated, signIn, register } = useAuth()
  const [isRegistering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const [name, email, password] = ['name', 'email', 'password'].map((key) => String(form.get(key) ?? ''))
    setBusy(true)
    setError(null)
    try {
      await (isRegistering ? register(name, email, password) : signIn(email, password))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="panel">
      <p className="brand"><CheckCircleIcon size={28} /> Todo</p>
      <h1>{isRegistering ? 'Create account' : 'Sign in'}</h1>
      <form onSubmit={submit}>
        {isRegistering && (
          <label>
            Name
            <input name="name" required minLength={2} maxLength={120} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isRegistering ? 8 : 1}
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
          />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" className="btn primary block" disabled={busy}>
          {isRegistering ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button type="button" className="btn ghost block" onClick={() => { setRegistering(!isRegistering); setError(null) }}>
        {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Create an account'}
      </button>
      </div>
    </main>
  )
}
