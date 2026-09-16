import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '../lib/ThemeContext'
import { useSession } from '../lib/auth-client'
import Toast from '../components/Toast'
import { useAppPaths } from '../lib/appPaths'
import type { UserPlan } from '../lib/storagePolicy'
import { KIMEM_AI_NAME, GROQ_API_KEYS_URL } from '../lib/kimemAi'
import { confirmAction } from '../lib/swal'

export default function Settings() {
    const router = useRouter()
    const { colors, theme } = useTheme()
    const { data: session, isPending } = useSession()
    const { apiPath, sitePath } = useAppPaths()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [validating, setValidating] = useState(false)
    const [savingProfile, setSavingProfile] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Profile state
    const [profileName, setProfileName] = useState('')
    const [userPlan, setUserPlan] = useState<UserPlan>('free')

    // Form state
    const [useCustomCredentials, setUseCustomCredentials] = useState(false)
    const [cloudinaryCloudName, setCloudinaryCloudName] = useState('')
    const [cloudinaryApiKey, setCloudinaryApiKey] = useState('')
    const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('')

    // Credential status
    const [hasCredentials, setHasCredentials] = useState(false)

    const [kimemHasOwnKey, setKimemHasOwnKey] = useState(false)
    const [kimemTrialRemaining, setKimemTrialRemaining] = useState<number | null>(null)
    const [kimemTrialMax, setKimemTrialMax] = useState(5)
    const [openAiApiKey, setOpenAiApiKey] = useState('')
    const [savingKimemKey, setSavingKimemKey] = useState(false)
    const [validatingKimemKey, setValidatingKimemKey] = useState(false)

    useEffect(() => {
        if (!isPending && !session) {
            router.push(sitePath('/login'))
        }
    }, [session, isPending, router])

    useEffect(() => {
        if (session) {
            loadProfile()
            loadCredentials()
            loadKimemStatus()
        }
    }, [session])

    const loadKimemStatus = async () => {
        try {
            const response = await fetch(apiPath('/kimem-ai/key'))
            if (response.ok) {
                const data = await response.json()
                setKimemHasOwnKey(!!data.hasOwnKey)
                if (typeof data.trialRemaining === 'number') setKimemTrialRemaining(data.trialRemaining)
                if (typeof data.trialMax === 'number') setKimemTrialMax(data.trialMax)
            }
        } catch {
            /* ignore */
        }
    }

    const loadProfile = async () => {
        try {
            const response = await fetch(apiPath('/profile'))
            if (response.ok) {
                const data = await response.json()
                setProfileName(data.name || '')
                setUserPlan(data.plan === 'pro' ? 'pro' : 'free')
            }
        } catch (error) {
            console.error('Failed to load profile:', error)
        }
    }

    const loadCredentials = async () => {
        setLoading(true)
        try {
            const response = await fetch(apiPath('/credentials'))
            if (response.ok) {
                const data = await response.json()
                setHasCredentials(data.hasCredentials)
                setUseCustomCredentials(data.useCustomCredentials || false)
            }
        } catch (error) {
            console.error('Failed to load credentials:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!profileName.trim()) {
            setToast({ message: 'Please enter your name', type: 'error' })
            return
        }

        setSavingProfile(true)
        try {
            const response = await fetch(apiPath('/profile'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: profileName }),
            })

            if (response.ok) {
                setToast({ message: 'Profile updated successfully!', type: 'success' })
            } else {
                const data = await response.json()
                setToast({ message: data.error || 'Failed to update profile', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to update profile', type: 'error' })
        } finally {
            setSavingProfile(false)
        }
    }

    const handleValidate = async () => {
        if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
            setToast({ message: 'Please fill in all Cloudinary fields', type: 'error' })
            return
        }

        setValidating(true)
        try {
            const response = await fetch(apiPath('/credentials'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cloudinaryCloudName,
                    cloudinaryApiKey,
                    cloudinaryApiSecret,
                    validateOnly: true,
                }),
            })

            const data = await response.json()

            if (data.valid) {
                setToast({ message: 'Cloudinary credentials are valid!', type: 'success' })
            } else {
                setToast({ message: `Invalid credentials: ${data.error}`, type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Validation failed', type: 'error' })
        } finally {
            setValidating(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const response = await fetch(apiPath('/credentials'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    neonDatabaseUrl: null,
                    cloudinaryCloudName: cloudinaryCloudName || null,
                    cloudinaryApiKey: cloudinaryApiKey || null,
                    cloudinaryApiSecret: cloudinaryApiSecret || null,
                    useCustomCredentials,
                }),
            })

            if (response.ok) {
                setToast({ message: 'Settings saved successfully!', type: 'success' })
                setHasCredentials(true)
            } else {
                const data = await response.json()
                setToast({ message: data.error || 'Failed to save settings', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to save settings', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleValidateKimemKey = async () => {
        if (!openAiApiKey.trim()) {
            setToast({ message: 'Paste your Groq API key first', type: 'error' })
            return
        }
        setValidatingKimemKey(true)
        try {
            const response = await fetch(apiPath('/kimem-ai/key'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: openAiApiKey, validateOnly: true }),
            })
            const data = await response.json()
            if (response.ok && data.valid) {
                setToast({ message: 'Groq key looks good!', type: 'success' })
            } else {
                setToast({ message: data.error || 'Invalid key', type: 'error' })
            }
        } catch {
            setToast({ message: 'Validation failed', type: 'error' })
        } finally {
            setValidatingKimemKey(false)
        }
    }

    const handleSaveKimemKey = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!openAiApiKey.trim()) {
            setToast({ message: 'Paste your Groq API key', type: 'error' })
            return
        }
        setSavingKimemKey(true)
        try {
            const response = await fetch(apiPath('/kimem-ai/key'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: openAiApiKey }),
            })
            const data = await response.json()
            if (response.ok) {
                setToast({ message: `${KIMEM_AI_NAME} will use your key from now on.`, type: 'success' })
                setKimemHasOwnKey(true)
                setOpenAiApiKey('')
                await loadKimemStatus()
            } else {
                setToast({ message: data.error || 'Failed to save key', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to save key', type: 'error' })
        } finally {
            setSavingKimemKey(false)
        }
    }

    const handleDeleteKimemKey = async () => {
        const okKey = await confirmAction({
            title: 'Remove Groq key?',
            text: 'You can only use Kimem AI while md-nest trial runs remain, unless you add a key again.',
            confirmText: 'Remove key',
            danger: true,
            icon: 'warning',
        })
        if (!okKey) return
        setSavingKimemKey(true)
        try {
            const response = await fetch(apiPath('/kimem-ai/key'), { method: 'DELETE' })
            if (response.ok) {
                setKimemHasOwnKey(false)
                setOpenAiApiKey('')
                await loadKimemStatus()
                setToast({ message: 'Groq key removed', type: 'success' })
            }
        } catch {
            setToast({ message: 'Failed to remove key', type: 'error' })
        } finally {
            setSavingKimemKey(false)
        }
    }

    const handleDelete = async () => {
        const okCreds = await confirmAction({
            title: 'Delete credentials?',
            text: 'You will revert to using the default shared storage.',
            confirmText: 'Delete credentials',
            danger: true,
            icon: 'warning',
        })
        if (!okCreds) return

        setSaving(true)
        try {
            const response = await fetch(apiPath('/credentials'), {
                method: 'DELETE',
            })

            if (response.ok) {
                setToast({ message: 'Credentials deleted successfully', type: 'success' })
                setHasCredentials(false)
                setUseCustomCredentials(false)
                setCloudinaryCloudName('')
                setCloudinaryApiKey('')
                setCloudinaryApiSecret('')
            } else {
                setToast({ message: 'Failed to delete credentials', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to delete credentials', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    if (isPending || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f5f5f5',
            }}>
                <div style={{ color: colors.text }}>Loading...</div>
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <div className="page-shell" style={{ paddingTop: '1.5rem' }}>
                <h1 className="page-title">Settings</h1>

                <div style={{
                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                    padding: '2rem',
                    borderRadius: '12px',
                    border: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e5e5',
                    marginBottom: '2rem',
                }}>
                    <h2 style={{
                        color: colors.text,
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                    }}>
                        Plan
                    </h2>
                    <p style={{ color: colors.text, opacity: 0.85, marginBottom: '1rem' }}>
                        {userPlan === 'pro'
                            ? 'You are on Pro — all your documents are stored permanently.'
                            : 'You are on the Free plan — documents expire after 30 days.'}
                    </p>
                    {userPlan !== 'pro' && (
                        <Link href={sitePath('/pricing')} className="header-btn primary">
                            Upgrade to Pro
                        </Link>
                    )}
                </div>

                {/* Profile Section */}
                <div style={{
                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                    padding: '2rem',
                    borderRadius: '12px',
                    border: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e5e5',
                    marginBottom: '2rem',
                }}>
                    <h2 style={{
                        color: colors.text,
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                    }}>
                        Profile
                    </h2>

                    <div style={{
                        backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                        padding: '1rem',
                        borderRadius: '8px',
                        borderLeft: '4px solid #22c55e',
                        marginBottom: '1.5rem',
                    }}>
                        <p style={{ color: colors.text, fontSize: '0.95rem', margin: 0 }}>
                            <strong>💡 Tip:</strong> Your name will automatically appear in the author acknowledgment field when you create documents.
                        </p>
                    </div>

                    <form onSubmit={handleSaveProfile}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                color: colors.text,
                                fontWeight: '500',
                                marginBottom: '0.5rem',
                                display: 'block',
                                fontSize: '0.95rem',
                            }}>
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Enter your name"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '8px',
                                    border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                    fontSize: '0.95rem',
                                    backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                    color: colors.text,
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={savingProfile}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: savingProfile
                                    ? (theme === 'dark' ? '#2a2a2a' : '#e5e5e5')
                                    : (theme === 'dark' ? '#ffffff' : '#000000'),
                                color: savingProfile
                                    ? (theme === 'dark' ? '#666666' : '#999999')
                                    : (theme === 'dark' ? '#000000' : '#ffffff'),
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: savingProfile ? 'not-allowed' : 'pointer',
                                opacity: savingProfile ? 0.6 : 1,
                            }}
                        >
                            {savingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

                <div
                    id="kimem-ai"
                    style={{
                        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                        padding: '2rem',
                        borderRadius: '12px',
                        border: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e5e5',
                        marginBottom: '2rem',
                    }}
                >
                    <h2 style={{
                        color: colors.text,
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                    }}>
                        {KIMEM_AI_NAME}
                    </h2>

                    {userPlan !== 'pro' ? (
                        <p style={{ color: colors.text, opacity: 0.85 }}>
                            Kimem AI is a Pro feature — create, edit, analyze, and restructure markdown with AI.{' '}
                            <Link href={sitePath('/pricing')}>Upgrade to Pro</Link>
                        </p>
                    ) : (
                        <>
                            <div style={{
                                backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                                padding: '1rem',
                                borderRadius: '8px',
                                borderLeft: '4px solid #3b82f6',
                                marginBottom: '1.5rem',
                            }}>
                                {kimemHasOwnKey ? (
                                    <p style={{ color: colors.text, fontSize: '0.95rem', margin: 0 }}>
                                        Your Groq API key is saved. Kimem uses <strong>your</strong> key for unlimited assistant runs.
                                    </p>
                                ) : kimemTrialRemaining != null && kimemTrialRemaining > 0 ? (
                                    <p style={{ color: colors.text, fontSize: '0.95rem', margin: 0 }}>
                                        <strong>Start with md-nest&apos;s trial API</strong> — {kimemTrialRemaining} of {kimemTrialMax} free
                                        Kimem runs left. When you want to keep going, add your own Groq key below.
                                    </p>
                                ) : (
                                    <p style={{ color: colors.text, fontSize: '0.95rem', margin: 0 }}>
                                        Trial runs used up. Add your Groq API key below to continue with Kimem AI.
                                    </p>
                                )}
                            </div>

                            <h3 style={{ color: colors.text, fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                                Get your API key
                            </h3>
                            <ol style={{ color: colors.text, opacity: 0.9, lineHeight: 1.6, marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
                                <li>
                                    Open{' '}
                                    <a href={GROQ_API_KEYS_URL} target="_blank" rel="noopener noreferrer">
                                        Groq API keys
                                    </a>{' '}
                                    and sign in.
                                </li>
                                <li>Click <strong>Create new secret key</strong> and copy it.</li>
                                <li>Paste it here and save — free tier limits apply on your Groq account.</li>
                            </ol>

                            <form onSubmit={handleSaveKimemKey}>
                                <label style={{
                                    color: colors.text,
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                    display: 'block',
                                    fontSize: '0.95rem',
                                }}>
                                    Groq API key
                                </label>
                                <input
                                    type="password"
                                    value={openAiApiKey}
                                    onChange={(e) => setOpenAiApiKey(e.target.value)}
                                    placeholder={kimemHasOwnKey ? 'Paste a new key to replace the saved one' : 'sk-…'}
                                    autoComplete="off"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        borderRadius: '8px',
                                        border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                        fontSize: '0.95rem',
                                        backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                        color: colors.text,
                                        outline: 'none',
                                        marginBottom: '1rem',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={handleValidateKimemKey}
                                        disabled={validatingKimemKey}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e5e5e5',
                                            color: colors.text,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: validatingKimemKey ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {validatingKimemKey ? 'Checking…' : 'Validate key'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingKimemKey}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
                                            color: theme === 'dark' ? '#000000' : '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: savingKimemKey ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {savingKimemKey ? 'Saving…' : 'Save key for Kimem AI'}
                                    </button>
                                    {kimemHasOwnKey && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteKimemKey}
                                            disabled={savingKimemKey}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                backgroundColor: 'transparent',
                                                color: '#ef4444',
                                                border: '2px solid #ef4444',
                                                borderRadius: '8px',
                                                fontWeight: 600,
                                                cursor: savingKimemKey ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            Remove key
                                        </button>
                                    )}
                                </div>
                            </form>
                        </>
                    )}
                </div>

                {/* Storage Settings Section */}
                <h2 style={{
                    color: colors.text,
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                }}>
                    Storage Settings
                </h2>

                <div style={{
                    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                    padding: '2rem',
                    borderRadius: '12px',
                    border: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e5e5',
                    marginBottom: '2rem',
                }}>
                    <div style={{
                        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                        padding: '1rem',
                        borderRadius: '8px',
                        borderLeft: '4px solid #3b82f6',
                        marginBottom: '2rem',
                    }}>
                        <p style={{ color: colors.text, fontSize: '0.95rem', margin: 0 }}>
                            <strong>Default Storage:</strong> Your files are stored using our shared infrastructure
                            ({userPlan === 'pro' ? 'permanent on Pro' : '30-day retention on Free'}).
                        </p>
                        <p style={{ color: colors.text, fontSize: '0.95rem', margin: '0.5rem 0 0 0' }}>
                            <strong>Custom Storage:</strong> Use your own Cloudinary account for file delivery. Documents still use the shared md-nest database.
                        </p>
                    </div>

                    <form onSubmit={handleSave}>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                                color: colors.text,
                                fontWeight: '500',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={useCustomCredentials}
                                    onChange={(e) => setUseCustomCredentials(e.target.checked)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        cursor: 'pointer',
                                    }}
                                />
                                Use my own storage credentials
                            </label>
                        </div>

                        {useCustomCredentials && (
                            <>
                                <h3 style={{
                                    color: colors.text,
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    marginBottom: '1rem',
                                }}>
                                    Cloudinary Credentials
                                </h3>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        color: colors.text,
                                        fontWeight: '500',
                                        marginBottom: '0.5rem',
                                        display: 'block',
                                        fontSize: '0.95rem',
                                    }}>
                                        Cloud Name
                                    </label>
                                    <input
                                        type="text"
                                        value={cloudinaryCloudName}
                                        onChange={(e) => setCloudinaryCloudName(e.target.value)}
                                        placeholder="your-cloud-name"
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                            fontSize: '0.95rem',
                                            backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                            color: colors.text,
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        color: colors.text,
                                        fontWeight: '500',
                                        marginBottom: '0.5rem',
                                        display: 'block',
                                        fontSize: '0.95rem',
                                    }}>
                                        API Key
                                    </label>
                                    <input
                                        type="text"
                                        value={cloudinaryApiKey}
                                        onChange={(e) => setCloudinaryApiKey(e.target.value)}
                                        placeholder="123456789012345"
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                            fontSize: '0.95rem',
                                            backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                            color: colors.text,
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        color: colors.text,
                                        fontWeight: '500',
                                        marginBottom: '0.5rem',
                                        display: 'block',
                                        fontSize: '0.95rem',
                                    }}>
                                        API Secret
                                    </label>
                                    <input
                                        type="password"
                                        value={cloudinaryApiSecret}
                                        onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '8px',
                                            border: theme === 'dark' ? '2px solid #2a2a2a' : '2px solid #e5e5e5',
                                            fontSize: '0.95rem',
                                            backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
                                            color: colors.text,
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleValidate}
                                    disabled={validating}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e5e5e5',
                                        color: colors.text,
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        fontWeight: '500',
                                        cursor: validating ? 'not-allowed' : 'pointer',
                                        marginBottom: '1.5rem',
                                        opacity: validating ? 0.6 : 1,
                                    }}
                                >
                                    {validating ? 'Validating...' : 'Validate Cloudinary Credentials'}
                                </button>
                            </>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            marginTop: '2rem',
                        }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    backgroundColor: saving
                                        ? (theme === 'dark' ? '#2a2a2a' : '#e5e5e5')
                                        : (theme === 'dark' ? '#ffffff' : '#000000'),
                                    color: saving
                                        ? (theme === 'dark' ? '#666666' : '#999999')
                                        : (theme === 'dark' ? '#000000' : '#ffffff'),
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>

                            {hasCredentials && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving}
                                    style={{
                                        padding: '1rem 1.5rem',
                                        backgroundColor: 'transparent',
                                        color: '#ef4444',
                                        border: '2px solid #ef4444',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        opacity: saving ? 0.6 : 1,
                                    }}
                                >
                                    Delete Credentials
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
