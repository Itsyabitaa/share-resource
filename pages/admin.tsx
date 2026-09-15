import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'
import Toast from '../components/Toast'

type AdminUser = {
  id: string
  email: string
  name: string | null
  plan: 'free' | 'pro'
  created_at: string
}

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<'free' | 'pro'>('pro')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`${sitePath('/login')}?redirect=${encodeURIComponent('/admin')}`)
    }
  }, [session, isPending, router, sitePath])

  useEffect(() => {
    if (!session?.user) return

    fetch(apiPath('/profile'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(!!data?.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [session?.user, apiPath])

  const searchUsers = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(apiPath(`/admin/users?q=${encodeURIComponent(search.trim())}`))
      const data = await res.json()
      if (!res.ok) {
        setToast({ message: data.error || 'Search failed', type: 'error' })
        return
      }
      setUsers(data.users || [])
    } catch {
      setToast({ message: 'Search failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const assignPlan = async (targetEmail: string, targetPlan: 'free' | 'pro') => {
    setLoading(true)
    setToast(null)
    try {
      const res = await fetch(apiPath('/admin/set-plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, plan: targetPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ message: data.error || 'Update failed', type: 'error' })
        return
      }
      setToast({ message: data.message || 'Plan updated', type: 'success' })
      if (search.trim()) {
        await searchUsers()
      }
    } catch {
      setToast({ message: 'Update failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!session || isAdmin === null) {
    return null
  }

  if (!isAdmin) {
    return (
      <div className="page-shell" style={{ color: colors.text }}>
        <h1 className="page-title">Admin</h1>
        <p>You do not have admin access. Add your email to <code>ADMIN_EMAILS</code> in Vercel env vars.</p>
      </div>
    )
  }

  return (
    <div className="page-shell wide" style={{ color: colors.text }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 className="page-title">Admin — Pro accounts</h1>
      <p className="page-subtitle">
        Grant or revoke Pro by user email. Pro gives permanent storage; Free keeps documents for 30 days.
      </p>

      <section style={{
        padding: 24,
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        background: colors.cardBackground,
        marginBottom: 32,
      }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Assign plan</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            style={{
              flex: '1 1 240px',
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.inputBackground,
              color: colors.text,
            }}
          />
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as 'free' | 'pro')}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.inputBackground,
              color: colors.text,
            }}
          >
            <option value="pro">Pro</option>
            <option value="free">Free</option>
          </select>
          <button
            type="button"
            className="header-btn primary"
            disabled={loading || !email.trim()}
            onClick={() => assignPlan(email.trim(), plan)}
          >
            Save plan
          </button>
        </div>
      </section>

      <section style={{
        padding: 24,
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        background: colors.cardBackground,
      }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Find users</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name"
            style={{
              flex: '1 1 240px',
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.inputBackground,
              color: colors.text,
            }}
          />
          <button type="button" className="header-btn" disabled={loading || !search.trim()} onClick={searchUsers}>
            Search
          </button>
        </div>

        {users.length === 0 ? (
          <p style={{ opacity: 0.7, margin: 0 }}>Search for a user to manage their plan.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{user.email}</div>
                  <div style={{ opacity: 0.7, fontSize: 14 }}>
                    {user.name || 'No name'} · {user.plan === 'pro' ? 'Pro' : 'Free'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {user.plan !== 'pro' && (
                    <button
                      type="button"
                      className="header-btn primary"
                      disabled={loading}
                      onClick={() => assignPlan(user.email, 'pro')}
                    >
                      Make Pro
                    </button>
                  )}
                  {user.plan === 'pro' && (
                    <button
                      type="button"
                      className="header-btn"
                      disabled={loading}
                      onClick={() => assignPlan(user.email, 'free')}
                    >
                      Set Free
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
