import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { signIn } from '../lib/auth-client'
import { useToast } from '../lib/ToastContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import PageContainer from '../components/PageContainer'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        const errorMessage = result.error.message || 'Login failed. Please check your credentials.'
        setError(errorMessage)
        showToast(errorMessage, 'error')
        setLoading(false)
        return
      }

      showToast('Successfully logged in! Redirecting...', 'success')
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Premium subtle background glow */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--color-accent-light) 0%, transparent 70%)',
          top: '-250px',
          right: '-250px',
          opacity: 0.5,
          zIndex: 0
        }}
      />
      
      <Card
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          zIndex: 1,
          boxShadow: '0 20px 25px -5px var(--color-shadow), 0 10px 10px -5px var(--color-shadow)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', fontFamily: 'var(--font-sans)' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 1.25rem',
              backgroundColor: 'var(--color-text)',
              color: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              userSelect: 'none'
            }}
          >
            <span>📝</span>
          </div>
          <h1
            style={{
              color: 'var(--color-text)',
              fontSize: 'var(--font-2xl)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: '-0.03em',
              margin: '0 0 4px 0'
            }}
          >
            md-Nest
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)', margin: 0 }}>
            Sign in to continue to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            error={error && error.toLowerCase().includes('email') ? error : undefined}
          />

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={error && error.toLowerCase().includes('password') ? error : undefined}
          />

          {error && !error.toLowerCase().includes('email') && !error.toLowerCase().includes('password') && (
            <div
              style={{
                backgroundColor: 'var(--color-error-light)',
                borderLeft: '4px solid var(--color-error)',
                color: 'var(--color-text)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-sm)',
                marginBottom: '1.5rem',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            style={{ width: '100%', height: '44px', marginTop: 'var(--space-2)' }}
          >
            Sign In
          </Button>
        </form>

        <div
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Don't have an account?{' '}
          <Link
            href="/signup"
            style={{
              color: 'var(--color-accent)',
              fontWeight: 'var(--weight-semibold)',
              textDecoration: 'underline'
            }}
          >
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  )
}
