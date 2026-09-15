import { useState } from 'react'
import { signIn } from '../lib/auth-client'
import { getAuthErrorMessage } from '../lib/authErrors'
import { useTheme } from '../lib/ThemeContext'
import { isGoogleAuthEnabled } from '../lib/googleAuth'

type GoogleSignInButtonProps = {
    callbackURL: string
    errorCallbackURL?: string
    onError?: (message: string) => void
    label?: string
}

export default function GoogleSignInButton({
    callbackURL,
    errorCallbackURL,
    onError,
    label = 'Continue with Google',
}: GoogleSignInButtonProps) {
    const [loading, setLoading] = useState(false)
    const { colors, theme } = useTheme()

    if (!isGoogleAuthEnabled()) {
        return null
    }

    const handleGoogle = async () => {
        setLoading(true)

        try {
            const result = await signIn.social({
                provider: 'google',
                callbackURL,
                errorCallbackURL: errorCallbackURL || callbackURL,
            })

            if (result.error) {
                const message = getAuthErrorMessage(result.error, 'Google sign-in failed.')
                onError?.(message)
                setLoading(false)
                return
            }

            const redirectUrl =
                (result.data as { url?: string } | undefined)?.url ||
                (result.data as { redirect?: boolean; url?: string } | undefined)?.redirect === true
                    ? (result.data as { url?: string }).url
                    : undefined

            if (redirectUrl) {
                window.location.href = redirectUrl
            }
        } catch (err: unknown) {
            const message = getAuthErrorMessage(err, 'Google sign-in failed.')
            onError?.(message)
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            className="oauth-btn google"
            onClick={handleGoogle}
            disabled={loading}
            style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                color: colors.text,
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                transition: 'all 0.2s ease',
            }}
        >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.194 8-11.303 8-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44c7.682 0 14.344-4.337 17.694-10.691z" />
            </svg>
            {loading ? 'Redirecting to Google...' : label}
        </button>
    )
}
