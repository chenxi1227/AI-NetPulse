import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 sm:p-8 w-full max-w-sm mx-4"
        style={{
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
          borderRadius: '32px',
          boxShadow:
            '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 0 2px 0 rgba(0,0,0,0.02), 0 0 10px 0 rgba(0,0,0,0.03), 0 10px 50px 0 rgba(0,0,0,0.07)',
          animation: 'modalScaleIn 200ms ease-out',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-black" />
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">AI NetPulse</h1>
          <p className="text-sm text-text-muted font-body mt-1">Sign in to the dashboard</p>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/50 text-danger text-sm font-body">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted font-body mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-body text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted font-body mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-body text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-base-border text-black rounded-lg transition-colors font-medium font-body"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
