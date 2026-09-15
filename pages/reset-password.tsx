import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '../lib/ThemeContext'
import { resetPassword } from '../lib/auth-client'
import { getAuthErrorMessage } from '../lib/authErrors'
import Toast from '../components/Toast'
import { useAppPaths } from '../lib/appPaths'
import BrandMark from '../components/BrandMark'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const router = useRouter()
    const { colors, theme } = useTheme()
    const { sitePath } = useAppPaths()

    const token = typeof router.query.token === 'string' ? router.query.token : ''
    const invalidToken = router.query.error === 'INVALID_TOKEN'

    useEffect(() => {
        if (!router.isReady) return
        if (invalidToken) {
            setError('This reset link is invalid or has expired. Request a new one.')
        }
    }, [router.isReady, invalidToken])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setToast(null)

        if (!token) {
            setError('Missing reset token. Open the link from your email again.')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const result = await resetPassword({
                newPassword: password,
                token,
            })

            if (result.error) {
                const message = getAuthErrorMessage(result.error, 'Could not reset password. The link may have expired.')
                setError(message)
                setToast({ message, type: 'error' })
                setLoading(false)
                return
            }

            setDone(true)
            setToast({ message: 'Password updated. Redirecting to sign in...', type: 'success' })
            setTimeout(() => {
                router.push(sitePath('/login'))
            }, 1500)
        } catch (err: unknown) {
            const message = getAuthErrorMessage(err, 'Could not reset password. Please try again.')
            setError(message)
            setToast({ message, type: 'error' })
        } finally {
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
        }}>
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}

            <div className="auth-card" style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: theme === 'dark' ? '#1c1917' : '#ffffff',
                borderRadius: '16px',
                boxShadow: theme === 'dark'
                    ? '0 20px 60px rgba(0, 0, 0, 0.8)'
                    : '0 20px 60px rgba(0, 0, 0, 0.08)',
                border: theme === 'dark' ? '1px solid #292524' : '1px solid #e7e5e4',
                padding: '2rem',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <BrandMark href={sitePath('/')} size={40} stacked />
                    </div>
                    <h2 style={{ color: colors.text, fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Choose a new password
                    </h2>
                    <p style={{ color: colors.text, opacity: 0.5, fontSize: '0.95rem' }}>
                        Enter your new password below
                    </p>
                </div>

                {done ? (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        backgroundColor: theme === 'dark' ? 'rgba(45, 106, 79, 0.15)' : 'rgba(45, 106, 79, 0.08)',
                        color: colors.text,
                        fontSize: '0.95rem',
                    }}>
                        Your password has been updated.
                    </div>
                ) : invalidToken ? (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: colors.text, marginBottom: '1.25rem', lineHeight: 1.6 }}>
                            This reset link is invalid or has expired.
                        </p>
                        <Link
                            href={sitePath('/forgot-password')}
                            style={{
                                color: colors.text,
                                fontWeight: 600,
                                textDecoration: 'underline',
                            }}
                        >
                            Request a new reset link
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label htmlFor="password" style={{
                                color: colors.text,
                                fontWeight: 500,
                                marginBottom: '0.5rem',
                                display: 'block',
                                fontSize: '0.95rem',
                            }}>
                                New password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '10px',
                                    border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                    fontSize: '1rem',
                                    backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                    color: colors.text,
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="confirmPassword" style={{
                                color: colors.text,
                                fontWeight: 500,
                                marginBottom: '0.5rem',
                                display: 'block',
                                fontSize: '0.95rem',
                            }}>
                                Confirm password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '10px',
                                    border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                    fontSize: '1rem',
                                    backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                    color: colors.text,
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                backgroundColor: theme === 'dark' ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 0, 0, 0.06)',
                                color: theme === 'dark' ? '#ffb4b4' : '#b91c1c',
                                padding: '0.875rem 1rem',
                                borderRadius: '10px',
                                marginBottom: '1.5rem',
                                fontSize: '0.9rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !token}
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
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Updating...' : 'Update password'}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
                    <Link href={sitePath('/login')} style={{ color: colors.text, opacity: 0.6, fontSize: '0.95rem' }}>
                        ← Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
