import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'
import Toast from '../components/Toast'
import type { AdminFileRow, ActivityRow } from '../lib/moderationDb'
import { COMMUNITY_TAKEDOWN_MESSAGE } from '../lib/moderation'

type AdminUser = {
  id: string
  email: string
  name: string | null
  plan: 'free' | 'pro'
  created_at: string
}

type Tab = 'overview' | 'viral' | 'moderation' | 'activity' | 'plans'

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [viralPosts, setViralPosts] = useState<AdminFileRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [modSearch, setModSearch] = useState('')
  const [modFiles, setModFiles] = useState<AdminFileRow[]>([])
  const [modReason, setModReason] = useState(COMMUNITY_TAKEDOWN_MESSAGE)

  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [planEmail, setPlanEmail] = useState('')
  const [plan, setPlan] = useState<'free' | 'pro'>('pro')

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

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiPath('/admin/dashboard'))
      const data = await res.json()
      if (res.ok) {
        setStats(data.stats)
        setViralPosts(data.viralPosts || [])
        setActivity(data.activity || [])
      }
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    if (isAdmin) loadDashboard()
  }, [isAdmin, loadDashboard])

  const searchModerationFiles = async () => {
    setLoading(true)
    try {
      const q = modSearch.trim()
      const url = q
        ? apiPath(`/admin/files?q=${encodeURIComponent(q)}`)
        : apiPath('/admin/files')
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setModFiles(data.files || [])
    } finally {
      setLoading(false)
    }
  }

  const moderateFile = async (fileId: string, action: 'remove' | 'private' | 'warn' | 'restore') => {
    setLoading(true)
    try {
      const res = await fetch(apiPath('/admin/moderate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          action,
          reason: modReason.trim() || COMMUNITY_TAKEDOWN_MESSAGE,
          warningMessage: modReason.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ message: data.error || 'Moderation failed', type: 'error' })
        return
      }
      setToast({ message: data.message || 'Action applied', type: 'success' })
      await Promise.all([loadDashboard(), searchModerationFiles()])
    } catch {
      setToast({ message: 'Moderation failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async () => {
    if (!userSearch.trim()) return
    setLoading(true)
    try {
      const res = await fetch(apiPath(`/admin/users?q=${encodeURIComponent(userSearch.trim())}`))
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } finally {
      setLoading(false)
    }
  }

  const assignPlan = async (targetEmail: string, targetPlan: 'free' | 'pro') => {
    setLoading(true)
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
      if (userSearch.trim()) await searchUsers()
    } finally {
      setLoading(false)
    }
  }

  if (!session || isAdmin === null) return null

  if (!isAdmin) {
    return (
      <div className="page-shell" style={{ color: colors.text }}>
        <h1 className="page-title">Admin</h1>
        <p>Add your email to <code>ADMIN_EMAILS</code> in Vercel env vars.</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'viral', label: 'Viral posts' },
    { id: 'moderation', label: 'Moderation' },
    { id: 'activity', label: 'Activity' },
    { id: 'plans', label: 'Pro plans' },
  ]

  return (
    <div className="page-shell wide admin-dashboard" style={{ color: colors.text }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="admin-header">
        <div>
          <p className="composer-kicker">Admin</p>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Monitor activity, viral posts, and community guidelines.</p>
        </div>
        <button type="button" className="header-btn" disabled={loading} onClick={loadDashboard}>
          Refresh
        </button>
      </header>

      <nav className="admin-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => {
              setTab(item.id)
              if (item.id === 'moderation' && modFiles.length === 0) {
                searchModerationFiles()
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && stats && (
        <div className="admin-stat-grid">
          {[
            ['Users', stats.users],
            ['Documents', stats.files],
            ['Public', stats.public_files],
            ['Removed', stats.removed_files],
            ['Warned', stats.warned_files],
            ['Total views', stats.total_views],
            ['Total shares', stats.total_shares],
            ['Warnings sent', stats.total_warnings],
          ].map(([label, value]) => (
            <div key={String(label)} className="admin-stat-card" style={{ background: colors.cardBackground, borderColor: colors.border }}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}

      {tab === 'viral' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <h2>Trending / viral posts</h2>
          <p className="admin-hint">Ranked by views, shares, likes, and comments.</p>
          <AdminFileTable
            files={viralPosts}
            sitePath={sitePath}
            onModerate={moderateFile}
            loading={loading}
          />
        </section>
      )}

      {tab === 'moderation' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <h2>Moderate content</h2>
          <div className="admin-toolbar">
            <input
              value={modSearch}
              onChange={(e) => setModSearch(e.target.value)}
              placeholder="Search posts by title, author, or owner email"
              style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
            />
            <button type="button" className="header-btn" disabled={loading} onClick={searchModerationFiles}>
              Search
            </button>
          </div>
          <label className="admin-field">
            <span>Warning / takedown message</span>
            <textarea
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              rows={2}
              style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
            />
          </label>
          <AdminFileTable
            files={modFiles}
            sitePath={sitePath}
            onModerate={moderateFile}
            loading={loading}
            showModeration
          />
        </section>
      )}

      {tab === 'activity' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <h2>Recent activity</h2>
          <div className="admin-activity-list">
            {activity.length === 0 ? (
              <p className="admin-hint">No activity yet.</p>
            ) : (
              activity.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="admin-activity-row">
                  <div>
                    <strong>{item.label}</strong>
                    <div className="admin-hint">
                      {item.kind.replace(/_/g, ' ')}
                      {item.file_title ? ` · ${item.file_title}` : ''}
                      {item.actor_email ? ` · ${item.actor_email}` : ''}
                    </div>
                  </div>
                  <time>{new Date(item.at).toLocaleString()}</time>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {tab === 'plans' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <h2>Pro accounts</h2>
          <div className="admin-toolbar">
            <input
              value={planEmail}
              onChange={(e) => setPlanEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
            />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as 'free' | 'pro')}
              style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
            >
              <option value="pro">Pro</option>
              <option value="free">Free</option>
            </select>
            <button
              type="button"
              className="header-btn primary"
              disabled={loading || !planEmail.trim()}
              onClick={() => assignPlan(planEmail.trim(), plan)}
            >
              Save plan
            </button>
          </div>
          <div className="admin-toolbar">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by email or name"
              style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
            />
            <button type="button" className="header-btn" disabled={loading || !userSearch.trim()} onClick={searchUsers}>
              Search users
            </button>
          </div>
          {users.map((user) => (
            <div key={user.id} className="admin-activity-row">
              <div>
                <strong>{user.email}</strong>
                <div className="admin-hint">{user.name || 'No name'} · {user.plan}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {user.plan !== 'pro' && (
                  <button type="button" className="header-btn primary" disabled={loading} onClick={() => assignPlan(user.email, 'pro')}>
                    Make Pro
                  </button>
                )}
                {user.plan === 'pro' && (
                  <button type="button" className="header-btn" disabled={loading} onClick={() => assignPlan(user.email, 'free')}>
                    Set Free
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function AdminFileTable({
  files,
  sitePath,
  onModerate,
  loading,
  showModeration = true,
}: {
  files: AdminFileRow[]
  sitePath: (path: string) => string
  onModerate: (fileId: string, action: 'remove' | 'private' | 'warn' | 'restore') => void
  loading: boolean
  showModeration?: boolean
}) {
  if (files.length === 0) {
    return <p className="admin-hint">No posts to show.</p>
  }

  return (
    <div className="admin-file-table">
      {files.map((file) => (
        <div key={file.id} className="admin-file-row">
          <div className="admin-file-main">
            <Link href={sitePath(`/file/${file.id}`)} className="admin-file-title">
              {file.title || 'Untitled'}
            </Link>
            <div className="admin-hint">
              {file.is_public ? 'Public' : 'Private'}
              {file.user_id ? ' · signed-in' : ' · guest'}
              {file.user_email ? ` · ${file.user_email}` : ''}
              {' · '}
              {file.view_count} views · {file.share_count} shares · {file.like_count} likes
              {' · score '}{file.viral_score}
              {file.moderation_status !== 'active' ? ` · ${file.moderation_status}` : ''}
            </div>
          </div>
          {showModeration && (
            <div className="admin-file-actions">
              <button type="button" className="header-btn" disabled={loading} onClick={() => onModerate(file.id, 'warn')}>
                Warn
              </button>
              <button type="button" className="header-btn" disabled={loading} onClick={() => onModerate(file.id, 'private')}>
                Private
              </button>
              <button type="button" className="header-btn" disabled={loading} onClick={() => onModerate(file.id, 'remove')}>
                Takedown
              </button>
              {file.moderation_status !== 'active' && (
                <button type="button" className="header-btn primary" disabled={loading} onClick={() => onModerate(file.id, 'restore')}>
                  Restore
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
