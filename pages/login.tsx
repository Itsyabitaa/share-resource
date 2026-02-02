import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '../lib/ThemeContext'
import { signIn } from '../lib/auth-client'
import Toast from '../components/Toast'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const router = useRouter()
    const { colors, theme } = useTheme()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        setToast(null) // Clear any existing toast

        try {
            const result = await signIn.email({
                email,
                password,
            })

            // Check if there was an error
            if (result.error) {
                const errorMessage = result.error.message || 'Login failed. Please check your credentials.'
                setError(errorMessage)
                setToast({ message: errorMessage, type: 'error' })
                setLoading(false)
                return
            }

            // Success
            setToast({ message: 'Successfully logged in! Redirecting...', type: 'success' })
            setTimeout(() => {
                window.location.href = '/'
            }, 1000)
        } catch (err: any) {
            const errorMessage = err.message || 'Login failed. Please check your credentials.'
            setError(errorMessage)
            setToast({ message: errorMessage, type: 'error' })
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f5f5f5',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Toast notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Subtle animated background pattern */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: theme === 'dark'
                    ? 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)',
                top: '-300px',
                right: '-300px',
                animation: 'float 8s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: theme === 'dark'
                    ? 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(0,0,0,0.015) 0%, transparent 70%)',
                bottom: '-250px',
                left: '-250px',
                animation: 'float 10s ease-in-out infinite reverse'
            }} />

            <div style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                padding: '3rem',
                borderRadius: '16px',
                boxShadow: theme === 'dark'
                    ? '0 20px 60px rgba(0, 0, 0, 0.8)'
                    : '0 20px 60px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                zIndex: 1,
                border: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e5e5'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        margin: '0 auto 1.5rem',
                        backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        transition: 'transform 0.3s ease',
                        cursor: 'default'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05) rotate(-5deg)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                    >
                        <span style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}>📝</span>
                    </div>
                    <h1 style={{
                        color: colors.text,
                        marginBottom: '0.5rem',
                        fontSize: '2rem',
                        fontWeight: '700',
                        letterSpacing: '-0.02em'
                    }}>
                        md-Nest
                    </h1>
                    <h2 style={{
                        color: colors.text,
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        opacity: 0.9,
                        marginBottom: '0.5rem'
                    }}>
                        Welcome Back
                    </h2>
                    <p style={{
                        color: colors.text,
                        opacity: 0.5,
                        fontSize: '0.95rem'
                    }}>
                        Sign in to continue to your account
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="email" style={{
                            color: colors.text,
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            display: 'block',
                            fontSize: '0.95rem'
                        }}>
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            autoComplete="email"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: '10px',
                                border: theme === 'dark'
                                    ? '2px solid #2a2a2a'
                                    : '2px solid #e5e5e5',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                                backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                color: colors.text,
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = theme === 'dark' ? '#ffffff' : '#000000'
                                e.target.style.backgroundColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = theme === 'dark' ? '#2a2a2a' : '#e5e5e5'
                                e.target.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#fafafa'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="password" style={{
                            color: colors.text,
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            display: 'block',
                            fontSize: '0.95rem'
                        }}>
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            minLength={8}
                            autoComplete="current-password"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: '10px',
                                border: theme === 'dark'
                                    ? '2px solid #2a2a2a'
                                    : '2px solid #e5e5e5',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                                backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                color: colors.text,
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = theme === 'dark' ? '#ffffff' : '#000000'
                                e.target.style.backgroundColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = theme === 'dark' ? '#2a2a2a' : '#e5e5e5'
                                e.target.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#fafafa'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            color: colors.text,
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem',
                            borderLeft: `4px solid ${theme === 'dark' ? '#ff4444' : '#ff0000'}`,
                            animation: 'slideIn 0.3s ease'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            backgroundColor: loading
                                ? (theme === 'dark' ? '#2a2a2a' : '#e5e5e5')
                                : (theme === 'dark' ? '#ffffff' : '#000000'),
                            color: loading
                                ? (theme === 'dark' ? '#666666' : '#999999')
                                : (theme === 'dark' ? '#000000' : '#ffffff'),
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: loading ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.opacity = '0.9'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.opacity = '1'
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    width: '16px',
                                    height: '16px',
                                    border: `2px solid ${theme === 'dark' ? '#666666' : '#999999'}`,
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite'
                                }} />
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div style={{
                    textAlign: 'center',
                    marginTop: '2rem',
                    paddingTop: '2rem',
                    borderTop: theme === 'dark'
                        ? '1px solid #2a2a2a'
                        : '1px solid #e5e5e5'
                }}>
                    <p style={{ color: colors.text, opacity: 0.6, fontSize: '0.95rem' }}>
                        Don't have an account?{' '}
                        <Link href="/signup" style={{
                            color: colors.text,
                            fontWeight: '600',
                            textDecoration: 'underline',
                            transition: 'opacity 0.2s'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            Sign Up
                        </Link>
                    </p>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <Link href="/" style={{
                        color: colors.text,
                        opacity: 0.5,
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        transition: 'opacity 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}
