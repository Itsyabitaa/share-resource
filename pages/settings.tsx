import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useToast } from '../lib/ToastContext'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Settings() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Profile state
  const [profileName, setProfileName] = useState('')

  // Form state
  const [useCustomCredentials, setUseCustomCredentials] = useState(false)
  const [neonDatabaseUrl, setNeonDatabaseUrl] = useState('')
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('')
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('')
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('')

  // Credential status
  const [hasCredentials, setHasCredentials] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProfile()
      loadCredentials()
    }
  }, [session])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfileName(data.name || '')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const loadCredentials = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/credentials')
      if (response.ok) {
        const data = await response.json()
        setHasCredentials(data.hasCredentials)
        setUseCustomCredentials(data.useCustomCredentials || false)
        if (data.credentials) {
          setNeonDatabaseUrl(data.credentials.neonDatabaseUrl || '')
          setCloudinaryCloudName(data.credentials.cloudinaryCloudName || '')
          setCloudinaryApiKey(data.credentials.cloudinaryApiKey || '')
          setCloudinaryApiSecret(data.credentials.cloudinaryApiSecret || '')
        }
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
      showToast('Please enter your name', 'error')
      return
    }

    setSavingProfile(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      })

      if (response.ok) {
        showToast('Profile updated successfully!', 'success')
      } else {
        const data = await response.json()
        showToast(data.error || 'Failed to update profile', 'error')
      }
    } catch (error) {
      showToast('Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleValidate = async () => {
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      showToast('Please fill in all Cloudinary fields', 'error')
      return
    }

    setValidating(true)
    try {
      const response = await fetch('/api/credentials', {
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
        showToast('Cloudinary credentials are valid!', 'success')
      } else {
        showToast(`Invalid credentials: ${data.error}`, 'error')
      }
    } catch (error) {
      showToast('Validation failed', 'error')
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neonDatabaseUrl: neonDatabaseUrl || null,
          cloudinaryCloudName: cloudinaryCloudName || null,
          cloudinaryApiKey: cloudinaryApiKey || null,
          cloudinaryApiSecret: cloudinaryApiSecret || null,
          useCustomCredentials,
        }),
      })

      if (response.ok) {
        showToast('Settings saved successfully!', 'success')
        setHasCredentials(true)
      } else {
        const data = await response.json()
        showToast(data.error || 'Failed to save settings', 'error')
      }
    } catch (error) {
      showToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your custom credentials? You will revert to using the default storage.')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/credentials', {
        method: 'DELETE',
      })

      if (response.ok) {
        showToast('Credentials deleted successfully', 'success')
        setHasCredentials(false)
        setUseCustomCredentials(false)
        setNeonDatabaseUrl('')
        setCloudinaryCloudName('')
        setCloudinaryApiKey('')
        setCloudinaryApiSecret('')
      } else {
        const data = await response.json()
        showToast(data.error || 'Failed to delete credentials', 'error')
      }
    } catch (error) {
      showToast('Failed to delete credentials', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (isPending || loading) {
    return (
      <PageContainer maxWidth="800px">
        <Navbar />
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)', fontSize: 'var(--font-base)' }}>
          Loading Settings...
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="800px">
      <Navbar />

      <div style={{ marginTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
          Settings
        </h1>

        {/* Profile Card */}
        <Card style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
            Profile Details
          </h2>
          <div
            style={{
              backgroundColor: 'var(--color-accent-light)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--color-accent)',
              marginBottom: 'var(--space-4)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-sm)'
            }}
          >
            <strong>💡 Tip:</strong> Your display name will auto-populate the author field on the document editor.
          </div>

          <form onSubmit={handleSaveProfile}>
            <Input
              id="profile-name"
              type="text"
              label="Display Name"
              placeholder="Enter your name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <Button type="submit" loading={savingProfile}>
              Save Profile
            </Button>
          </form>
        </Card>

        {/* Storage Settings Card */}
        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>
          Storage Settings
        </h2>

        <Card style={{ marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--color-border)',
              marginBottom: 'var(--space-5)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-sm)',
              lineHeight: 'var(--leading-relaxed)'
            }}
          >
            <div><strong>Default Storage:</strong> Files are stored using our shared permanent infrastructure.</div>
            <div style={{ marginTop: '4px' }}><strong>Custom Storage:</strong> Input your own Neon Database and Cloudinary credentials.</div>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  fontSize: 'var(--font-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={useCustomCredentials}
                  onChange={(e) => setUseCustomCredentials(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Use my own storage credentials
              </label>
            </div>

            {useCustomCredentials && (
              <div style={{ animation: 'fade-in var(--transition-fast) forwards' }}>
                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-bold)', marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
                  Neon Database Configuration (Optional)
                </h3>
                <Input
                  id="db-url"
                  type="text"
                  label="Database Connection URL"
                  placeholder="postgresql://user:password@host/database"
                  value={neonDatabaseUrl}
                  onChange={(e) => setNeonDatabaseUrl(e.target.value)}
                />
                <small style={{ color: 'var(--color-text-weak)', fontSize: 'var(--font-xs)', display: 'block', marginTop: '-8px', marginBottom: 'var(--space-4)' }}>
                  Leave blank to continue saving metadata to md-Nest default database.
                </small>

                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-bold)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
                  Cloudinary Asset Configuration
                </h3>
                <Input
                  id="cloud-name"
                  type="text"
                  label="Cloud Name"
                  placeholder="your-cloud-name"
                  value={cloudinaryCloudName}
                  onChange={(e) => setCloudinaryCloudName(e.target.value)}
                />
                <Input
                  id="api-key"
                  type="text"
                  label="API Key"
                  placeholder="123456789012345"
                  value={cloudinaryApiKey}
                  onChange={(e) => setCloudinaryApiKey(e.target.value)}
                />
                <Input
                  id="api-secret"
                  type="password"
                  label="API Secret"
                  placeholder="••••••••••••••••"
                  value={cloudinaryApiSecret}
                  onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleValidate}
                  loading={validating}
                  style={{ marginBottom: 'var(--space-6)' }}
                >
                  Validate Cloudinary Credentials
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-5)' }}>
              <Button type="submit" loading={saving} style={{ flex: 1 }}>
                Save Settings
              </Button>
              {hasCredentials && (
                <Button type="button" variant="danger" onClick={handleDelete} loading={saving}>
                  Delete Credentials
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </PageContainer>
  )
}
