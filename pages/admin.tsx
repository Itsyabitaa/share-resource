import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'
import Toast from '../components/Toast'
import type {
  AdminAnalytics,
  AdminFileRow,
  ActivityRow,
  AdminFileSort,
  AdminFileStatusFilter,
} from '../lib/moderationDb'
import {
  COMMUNITY_TAKEDOWN_MESSAGE,
  DEFAULT_WARNING_MESSAGE,
  type ModerationAction,
} from '../lib/moderation'
import { confirmAction, promptTextarea } from '../lib/swal'

type AdminUserApiUsage = {
  kimemUsesTotal: number
  kimemTrialUsed: number
  kimemTrialMax: number
  photoConversionsUsed: number
  hasGroqKey: boolean
  groqKeyDisplay: string | null
}

type AdminUser = {
  id: string
  email: string
  name: string | null
  plan: 'free' | 'pro'
  created_at: string
  email_verified: boolean
  auth_providers: string | null
  file_count: number
  last_seen: string | null
  image: string | null
  apiUsage?: AdminUserApiUsage
}

type AccountProviderFilter = 'all' | 'google' | 'email'
type AccountActivityFilter = 'all' | 'has_docs' | 'verified'

function formatAuthProviders(value: string | null) {
  if (!value) return 'Email / password'
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((provider) => {
      if (provider === 'google') return 'Google'
      if (provider === 'credential') return 'Email'
      return provider.charAt(0).toUpperCase() + provider.slice(1)
    })
    .join(', ')
}

function isGoogleUser(user: AdminUser) {
  return (user.auth_providers || '').includes('google')
}

type Tab = 'overview' | 'analytics' | 'posts' | 'viral' | 'activity' | 'accounts' | 'api-keys'

type PlatformGroqKeyAdmin = {
  id: string
  label: string | null
  keyDisplay: string
  sortOrder: number
  enabled: boolean
  useCount: number
  lastUsedAt: string | null
  lastErrorAt: string | null
  lastError: string | null
  cooldownUntil: string | null
  createdAt: string
}

const tabMeta: Record<Tab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Dashboard',
    subtitle: 'Quick summary — top metrics, viral posts, and latest activity.',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Full breakdown of users, content, engagement, growth, and moderation.',
  },
  posts: {
    title: 'Posts',
    subtitle: 'Search, filter, and moderate every document.',
  },
  viral: {
    title: 'Viral posts',
    subtitle: 'Trending content ranked by engagement.',
  },
  activity: {
    title: 'Activity',
    subtitle: 'Uploads, edits, and moderation events.',
  },
  accounts: {
    title: 'Accounts',
    subtitle: 'Real sign-ups from your database — filter by Google, activity, or search.',
  },
  'api-keys': {
    title: 'Global Groq API keys',
    subtitle: 'Kimem AI trial pool — keys are tried in order; rate-limited keys auto-rotate to the next.',
  },
}

function parseTab(value: unknown): Tab {
  if (
    value === 'analytics' ||
    value === 'posts' ||
    value === 'viral' ||
    value === 'activity' ||
    value === 'accounts' ||
    value === 'api-keys'
  ) {
    return value
  }
  return 'overview'
}

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()

  const tab = parseTab(router.query.tab)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [stats, setStats] = useState<AdminAnalytics | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [viralPosts, setViralPosts] = useState<AdminFileRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [postSearch, setPostSearch] = useState('')
  const [postStatus, setPostStatus] = useState<AdminFileStatusFilter>('all')
  const [postSort, setPostSort] = useState<AdminFileSort>('newest')
  const [postFiles, setPostFiles] = useState<AdminFileRow[]>([])

  const [userSearch, setUserSearch] = useState('')
  const [accountProvider, setAccountProvider] = useState<AccountProviderFilter>('all')
  const [accountActivity, setAccountActivity] = useState<AccountActivityFilter>('all')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [planEmail, setPlanEmail] = useState('')
  const [plan, setPlan] = useState<'free' | 'pro'>('pro')

  const [platformKeys, setPlatformKeys] = useState<PlatformGroqKeyAdmin[]>([])
  const [envFallback, setEnvFallback] = useState<{ configured: boolean; keyDisplay?: string; note?: string } | null>(null)
  const [newGroqLabel, setNewGroqLabel] = useState('')
  const [newGroqKey, setNewGroqKey] = useState('')

  const [apiDetailUserId, setApiDetailUserId] = useState<string | null>(null)
  const [apiDetailLoading, setApiDetailLoading] = useState(false)
  const [apiDetail, setApiDetail] = useState<{
    email: string
    name: string | null
    groqApiKey: string | null
    groqKeyDisplay: string | null
    usage: {
      plan: string
      kimem: {
        totalRuns: number
        trialUsed: number
        trialMax: number
        trialRemaining: number
        hasOwnGroqKey: boolean
        remainingLabel: string
      } | null
      photoScans: { used: number; max: number | null; remaining: number | null; unlimited: boolean }
      folders: { used: number; max: number | null; remaining: number | null; unlimited: boolean }
    }
  } | null>(null)

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
        setStats(data.stats || null)
        setAnalytics(data.analytics || data.stats || null)
        setViralPosts(data.viralPosts || [])
        setActivity(data.activity || [])
      }
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (postSearch.trim()) params.set('q', postSearch.trim())
      params.set('status', postStatus)
      params.set('sort', postSort)
      const res = await fetch(apiPath(`/admin/files?${params.toString()}`))
      const data = await res.json()
      if (res.ok) {
        const files = (data.files || []) as AdminFileRow[]
        const seen = new Set<string>()
        setPostFiles(files.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true))))
      }
    } finally {
      setLoading(false)
    }
  }, [apiPath, postSearch, postStatus, postSort])

  const loadViral = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiPath('/admin/files?mode=viral'))
      const data = await res.json()
      if (res.ok) setViralPosts(data.files || [])
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  const loadUsers = useCallback(async (overrides?: {
    query?: string
    provider?: AccountProviderFilter
    activity?: AccountActivityFilter
  }) => {
    setLoading(true)
    try {
      const q = (overrides?.query ?? userSearch).trim()
      const provider = overrides?.provider ?? accountProvider
      const activity = overrides?.activity ?? accountActivity
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (provider !== 'all') params.set('provider', provider)
      if (activity !== 'all') params.set('activity', activity)
      const suffix = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(apiPath(`/admin/users${suffix}`))
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } finally {
      setLoading(false)
    }
  }, [apiPath, userSearch, accountProvider, accountActivity])

  const loadUserApiDetail = useCallback(async (userId: string) => {
    setApiDetailUserId(userId)
    setApiDetailLoading(true)
    setApiDetail(null)
    try {
      const res = await fetch(apiPath(`/admin/user-api-usage?userId=${encodeURIComponent(userId)}`))
      const data = await res.json()
      if (res.ok && data.detail) {
        setApiDetail(data.detail)
      } else {
        setToast({ message: data.error || 'Failed to load API usage', type: 'error' })
      }
    } finally {
      setApiDetailLoading(false)
    }
  }, [apiPath])

  const loadPlatformKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiPath('/admin/platform-groq-keys'))
      const data = await res.json()
      if (res.ok) {
        setPlatformKeys(data.keys || [])
        setEnvFallback(data.envFallback || null)
      }
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    if (!isAdmin) return
    if (tab === 'overview' || tab === 'analytics' || tab === 'activity') loadDashboard()
    if (tab === 'posts') loadPosts()
    if (tab === 'viral') loadViral()
    if (tab === 'accounts') loadUsers()
    if (tab === 'api-keys') loadPlatformKeys()
  }, [isAdmin, tab, loadDashboard, loadPosts, loadViral, loadUsers, loadPlatformKeys])

  const defaultModerationMessage = (action: ModerationAction) => {
    if (action === 'warn') return DEFAULT_WARNING_MESSAGE
    if (action === 'remove') return COMMUNITY_TAKEDOWN_MESSAGE
    if (action === 'private') return 'This post was made private by a moderator.'
    return ''
  }

  const moderateFile = async (fileId: string, action: ModerationAction, reason: string) => {
    setLoading(true)
    try {
      const trimmed = reason.trim()
      const res = await fetch(apiPath('/admin/moderate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          action,
          reason: trimmed || defaultModerationMessage(action) || COMMUNITY_TAKEDOWN_MESSAGE,
          warningMessage: action === 'warn' ? trimmed || DEFAULT_WARNING_MESSAGE : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ message: data.error || 'Moderation failed', type: 'error' })
        return
      }
      setToast({ message: data.message || 'Action applied', type: 'success' })
      if (tab === 'posts') await loadPosts()
      else if (tab === 'viral') await loadViral()
      else await loadDashboard()
    } catch {
      setToast({ message: 'Moderation failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const requestModerateFile = async (file: AdminFileRow, action: ModerationAction) => {
    const title = file.title?.trim() || 'Untitled'
    const subtitle = title.length > 80 ? `${title.slice(0, 80)}…` : title

    if (action === 'restore') {
      const ok = await confirmAction({
        title: 'Restore post',
        text: `Restore "${subtitle}" to active status?`,
        confirmText: 'Restore',
        icon: 'question',
      })
      if (!ok) return
      await moderateFile(file.id, action, '')
      return
    }

    const modalCopy =
      action === 'warn'
        ? {
            title: 'Send warning',
            inputLabel: 'Warning message (shown on post and emailed to owner)',
            confirmText: 'Send warning',
            danger: false,
            icon: 'warning' as const,
          }
        : action === 'remove'
          ? {
              title: 'Takedown post',
              inputLabel: 'Message shown to visitors',
              confirmText: 'Takedown',
              danger: true,
              icon: 'warning' as const,
            }
          : {
              title: 'Make post private',
              inputLabel: 'Note for moderation log (optional)',
              confirmText: 'Make private',
              danger: false,
              icon: 'question' as const,
            }

    const message = await promptTextarea({
      title: modalCopy.title,
      text: `"${subtitle}"`,
      inputLabel: modalCopy.inputLabel,
      inputValue: defaultModerationMessage(action),
      confirmText: modalCopy.confirmText,
      icon: modalCopy.icon,
      danger: modalCopy.danger,
      requireNonEmpty: action !== 'private',
    })
    if (message === null) return
    await moderateFile(file.id, action, message)
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
      await loadUsers()
    } finally {
      setLoading(false)
    }
  }

  const pageMeta = useMemo(() => tabMeta[tab], [tab])

  if (!session || isAdmin === null) return null

  if (!isAdmin) {
    return (
      <div className="page-shell" style={{ color: colors.text }}>
        <h1 className="page-title">Admin</h1>
        <p>
          Signed in as <strong>{session.user.email}</strong>. Add this exact email to{' '}
          <code>ADMIN_EMAILS</code> in Vercel, then redeploy.
        </p>
      </div>
    )
  }

  return (
    <div className="page-shell admin-dashboard" style={{ color: colors.text }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="admin-sticky-top">
        <header className="admin-header">
          <div>
            <p className="composer-kicker">Admin</p>
            <h1 className="page-title">{pageMeta.title}</h1>
            <p className="page-subtitle">{pageMeta.subtitle}</p>
          </div>
          <button
            type="button"
            className="header-btn"
            disabled={loading}
            onClick={() => {
              if (tab === 'posts') loadPosts()
              else if (tab === 'viral') loadViral()
              else if (tab === 'accounts') loadUsers()
              else if (tab === 'api-keys') loadPlatformKeys()
              else loadDashboard()
            }}
          >
            Refresh
          </button>
        </header>

        {tab === 'posts' && (
          <>
            <div className="admin-toolbar admin-toolbar-wrap admin-toolbar-labeled">
              <label className="admin-toolbar-field admin-toolbar-search">
                <span className="admin-toolbar-label">Search</span>
                <input
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadPosts()}
                  placeholder="Title, author, or owner email"
                  style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
                />
              </label>
              <label className="admin-toolbar-field">
                <span className="admin-toolbar-label">Status</span>
                <select
                  value={postStatus}
                  onChange={(e) => setPostStatus(e.target.value as AdminFileStatusFilter)}
                  style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="warned">Warned</option>
                  <option value="removed">Removed</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="guest">Guest posts</option>
                </select>
              </label>
              <label className="admin-toolbar-field">
                <span className="admin-toolbar-label">Sort</span>
                <select
                  value={postSort}
                  onChange={(e) => setPostSort(e.target.value as AdminFileSort)}
                  style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="viral">Viral score</option>
                  <option value="views">Most views</option>
                  <option value="shares">Most shares</option>
                </select>
              </label>
              <div className="admin-toolbar-field admin-toolbar-submit">
                <button type="button" className="header-btn primary" disabled={loading} onClick={loadPosts}>
                  Apply filters
                </button>
              </div>
            </div>
            <p className="admin-hint admin-mobile-tip">
              Tap Warn, Private, or Takedown on a post to open the message dialog.
            </p>
          </>
        )}

        {tab === 'accounts' && (
          <>
            <p className="admin-hint">
              Real accounts from Neon. Filter by Google, documents, or search.
            </p>
            <div className="admin-toolbar admin-toolbar-wrap">
              <input
                value={planEmail}
                onChange={(e) => setPlanEmail(e.target.value)}
                placeholder="Grant Pro by email"
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
            <div className="admin-toolbar admin-toolbar-wrap">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="Search by email or name"
                style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
              />
              <select
                value={accountProvider}
                onChange={(e) => setAccountProvider(e.target.value as AccountProviderFilter)}
                style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
              >
                <option value="all">All sign-in methods</option>
                <option value="google">Google only</option>
                <option value="email">Email / password only</option>
              </select>
              <select
                value={accountActivity}
                onChange={(e) => setAccountActivity(e.target.value as AccountActivityFilter)}
                style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
              >
                <option value="all">All activity</option>
                <option value="has_docs">Has documents</option>
                <option value="verified">Email verified</option>
              </select>
              <button type="button" className="header-btn primary" disabled={loading} onClick={() => loadUsers()}>
                Apply filters
              </button>
              <button
                type="button"
                className="header-btn"
                disabled={loading}
                onClick={() => {
                  setUserSearch('')
                  setAccountProvider('all')
                  setAccountActivity('all')
                  loadUsers({ query: '', provider: 'all', activity: 'all' })
                }}
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>

      {tab === 'overview' && stats && (
        <>
          <section className="admin-analytics-block">
            <h2 className="admin-block-title">At a glance</h2>
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
          </section>

          <div className="admin-dashboard-split">
            <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
              <div className="admin-panel-head">
                <h2>Trending now</h2>
                <Link href={sitePath('/admin?tab=viral')} className="admin-link-btn">View all</Link>
              </div>
              <AdminFileTable
                files={viralPosts.slice(0, 5)}
                sitePath={sitePath}
                onModerate={requestModerateFile}
                loading={loading}
                showModeration={false}
              />
            </section>

            <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
              <div className="admin-panel-head">
                <h2>Latest activity</h2>
                <Link href={sitePath('/admin?tab=activity')} className="admin-link-btn">View all</Link>
              </div>
              <div className="admin-activity-list">
                {activity.slice(0, 6).map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="admin-activity-row">
                    <div className="admin-activity-main">
                      <strong>{item.label}</strong>
                      <div className="admin-hint">
                        {item.kind.replace(/_/g, ' ')}
                        {item.actor_email ? ` · ${item.actor_email}` : ''}
                      </div>
                    </div>
                    <time>{new Date(item.at).toLocaleString()}</time>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {tab === 'analytics' && analytics && (
        <div className="admin-analytics-layout">
          <AnalyticsPanel title="Users" cardBackground={colors.cardBackground} borderColor={colors.border}>
            <div className="admin-stat-grid compact">
              {[
                ['Total', analytics.users],
                ['Pro', analytics.pro_users],
                ['Google', analytics.google_users],
                ['Verified', analytics.verified_users],
                ['New (7d)', analytics.users_7d],
                ['New (30d)', analytics.users_30d],
              ].map(([label, value]) => (
                <div key={String(label)} className="admin-stat-card" style={{ background: colors.cardBackground, borderColor: colors.border }}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <AnalyticsBar label="Google sign-in" value={analytics.google_users} total={analytics.users} tone="google" />
            <AnalyticsBar label="Email / password" value={analytics.email_users} total={analytics.users} />
            <AnalyticsBar label="Pro plan" value={analytics.pro_users} total={analytics.users} tone="pro" />
            <AnalyticsBar label="Free plan" value={analytics.free_users} total={analytics.users} />
            <AnalyticsBar label="Email verified" value={analytics.verified_users} total={analytics.users} tone="verified" />
          </AnalyticsPanel>

          <AnalyticsPanel title="Content" cardBackground={colors.cardBackground} borderColor={colors.border}>
            <div className="admin-stat-grid compact">
              {[
                ['Total docs', analytics.files],
                ['Public', analytics.public_files],
                ['Private', analytics.private_files],
                ['Guest posts', analytics.guest_files],
                ['Signed-in', analytics.signed_in_files],
                ['Active', analytics.active_files],
              ].map(([label, value]) => (
                <div key={String(label)} className="admin-stat-card" style={{ background: colors.cardBackground, borderColor: colors.border }}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <AnalyticsBar label="Public" value={analytics.public_files} total={analytics.files} tone="pro" />
            <AnalyticsBar label="Private" value={analytics.private_files} total={analytics.files} />
            <AnalyticsBar label="Guest uploads" value={analytics.guest_files} total={analytics.files} tone="warn" />
            <AnalyticsBar label="Signed-in uploads" value={analytics.signed_in_files} total={analytics.files} />
            <AnalyticsBar label="Removed" value={analytics.removed_files} total={analytics.files} tone="danger" />
            <AnalyticsBar label="Warned" value={analytics.warned_files} total={analytics.files} tone="warn" />
          </AnalyticsPanel>

          <AnalyticsPanel title="Storage tiers" cardBackground={colors.cardBackground} borderColor={colors.border}>
            <AnalyticsBar label="Pro storage" value={analytics.pro_tier_files} total={analytics.files} tone="pro" />
            <AnalyticsBar label="Free storage" value={analytics.free_tier_files} total={analytics.files} />
            <AnalyticsBar label="Guest storage" value={analytics.guest_tier_files} total={analytics.files} tone="warn" />
          </AnalyticsPanel>

          <AnalyticsPanel title="Engagement" cardBackground={colors.cardBackground} borderColor={colors.border}>
            <div className="admin-stat-grid compact">
              {[
                ['Views', analytics.total_views],
                ['Shares', analytics.total_shares],
                ['Edits', analytics.total_edits],
                ['Likes', analytics.total_likes],
                ['Comments', analytics.total_comments],
                ['Mod events', analytics.moderation_events],
              ].map(([label, value]) => (
                <div key={String(label)} className="admin-stat-card" style={{ background: colors.cardBackground, borderColor: colors.border }}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {analytics.files > 0 && (
              <p className="admin-hint">
                Avg {Math.round(analytics.total_views / analytics.files)} views ·{' '}
                {Math.round(analytics.total_shares / analytics.files)} shares per document
              </p>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel title="Growth" cardBackground={colors.cardBackground} borderColor={colors.border}>
            <AnalyticsBar label="New users (7 days)" value={analytics.users_7d} total={Math.max(analytics.users_30d, 1)} tone="pro" />
            <AnalyticsBar label="New users (30 days)" value={analytics.users_30d} total={Math.max(analytics.users, 1)} tone="pro" />
            <AnalyticsBar label="New documents (7 days)" value={analytics.files_7d} total={Math.max(analytics.files_30d, 1)} tone="google" />
            <AnalyticsBar label="New documents (30 days)" value={analytics.files_30d} total={Math.max(analytics.files, 1)} tone="google" />
          </AnalyticsPanel>

          <AnalyticsPanel title="Moderation health" cardBackground={colors.cardBackground} borderColor={colors.border}>
            <AnalyticsBar label="Active posts" value={analytics.active_files} total={analytics.files} tone="pro" />
            <AnalyticsBar label="Removed" value={analytics.removed_files} total={analytics.files} tone="danger" />
            <AnalyticsBar label="Warned" value={analytics.warned_files} total={analytics.files} tone="warn" />
            <AnalyticsBar label="User warnings sent" value={analytics.total_warnings} total={Math.max(analytics.total_warnings, analytics.users, 1)} tone="warn" />
          </AnalyticsPanel>
        </div>
      )}

      {tab === 'posts' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <AdminFileTable
            files={postFiles}
            sitePath={sitePath}
            onModerate={requestModerateFile}
            loading={loading}
          />
        </section>
      )}

      {tab === 'viral' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <p className="admin-hint">Ranked by views, shares, likes, and comments.</p>
          <AdminFileTable
            files={viralPosts}
            sitePath={sitePath}
            onModerate={requestModerateFile}
            loading={loading}
          />
        </section>
      )}

      {tab === 'activity' && (
        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          <div className="admin-activity-list">
            {activity.length === 0 ? (
              <p className="admin-hint">No activity yet.</p>
            ) : (
              activity.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="admin-activity-row">
                  <div className="admin-activity-main">
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

      {tab === 'api-keys' && (
        <>
          <p className="admin-hint">
            Pro users on Kimem trial use these keys (top to bottom). On rate limits, the next key runs automatically.
            Keys are stored encrypted; only the prefix/suffix is shown here.
          </p>

          {envFallback?.configured && (
            <div className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border, marginBottom: 16 }}>
              <strong>Env fallback:</strong> <code>{envFallback.keyDisplay}</code>
              <p className="admin-hint" style={{ margin: '8px 0 0' }}>{envFallback.note}</p>
            </div>
          )}

          <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border, marginBottom: 16 }}>
            <h2>Add Groq key</h2>
            <div className="admin-toolbar admin-toolbar-wrap">
              <input
                value={newGroqLabel}
                onChange={(e) => setNewGroqLabel(e.target.value)}
                placeholder="Label (optional) e.g. Key 2"
                style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text }}
              />
              <input
                type="password"
                value={newGroqKey}
                onChange={(e) => setNewGroqKey(e.target.value)}
                placeholder="gsk_…"
                autoComplete="off"
                style={{ borderColor: colors.border, background: colors.inputBackground, color: colors.text, minWidth: 280 }}
              />
              <button
                type="button"
                className="header-btn primary"
                disabled={loading || !newGroqKey.trim()}
                onClick={async () => {
                  setLoading(true)
                  try {
                    const res = await fetch(apiPath('/admin/platform-groq-keys'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ label: newGroqLabel, apiKey: newGroqKey }),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      setToast({ message: data.error || 'Failed to add key', type: 'error' })
                      return
                    }
                    setNewGroqKey('')
                    setNewGroqLabel('')
                    setToast({ message: 'Groq key added', type: 'success' })
                    await loadPlatformKeys()
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                Add key
              </button>
            </div>
          </section>

          <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
            <div className="admin-panel-head">
              <h2>Key pool ({platformKeys.length})</h2>
            </div>
            {platformKeys.length === 0 ? (
              <p className="admin-hint">No keys in the database yet. Add keys above or set GROQ_API_KEY on Vercel.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Key</th>
                      <th>Label</th>
                      <th>Uses</th>
                      <th>Status</th>
                      <th>Last error</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformKeys.map((key, index) => {
                      const inCooldown = key.cooldownUntil && new Date(key.cooldownUntil) > new Date()
                      const status = !key.enabled ? 'Disabled' : inCooldown ? 'Cooldown' : 'Active'
                      return (
                        <tr key={key.id}>
                          <td>{index + 1}</td>
                          <td><code>{key.keyDisplay}</code></td>
                          <td>{key.label || '—'}</td>
                          <td>{key.useCount}</td>
                          <td>
                            <span className={`admin-plan-badge ${status === 'Active' ? 'pro' : 'free'}`}>{status}</span>
                            {inCooldown && key.cooldownUntil && (
                              <div className="admin-hint">Until {new Date(key.cooldownUntil).toLocaleString()}</div>
                            )}
                          </td>
                          <td className="admin-hint" style={{ maxWidth: 220 }}>{key.lastError || '—'}</td>
                          <td className="admin-actions-cell">
                            <button type="button" className="header-btn" disabled={loading || index === 0} onClick={async () => {
                              await fetch(apiPath('/admin/platform-groq-keys'), {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: key.id, move: 'up' }),
                              })
                              await loadPlatformKeys()
                            }}>↑</button>
                            <button type="button" className="header-btn" disabled={loading || index === platformKeys.length - 1} onClick={async () => {
                              await fetch(apiPath('/admin/platform-groq-keys'), {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: key.id, move: 'down' }),
                              })
                              await loadPlatformKeys()
                            }}>↓</button>
                            <button type="button" className="header-btn" disabled={loading} onClick={async () => {
                              await fetch(apiPath('/admin/platform-groq-keys'), {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: key.id, enabled: !key.enabled }),
                              })
                              await loadPlatformKeys()
                            }}>{key.enabled ? 'Disable' : 'Enable'}</button>
                            <button type="button" className="header-btn" disabled={loading} onClick={async () => {
                              const okDel = await confirmAction({
                                title: 'Delete Groq key?',
                                text: 'Remove this key from the platform pool?',
                                confirmText: 'Delete',
                                danger: true,
                                icon: 'warning',
                              })
                              if (!okDel) return
                              await fetch(`${apiPath('/admin/platform-groq-keys')}?id=${encodeURIComponent(key.id)}`, { method: 'DELETE' })
                              await loadPlatformKeys()
                            }}>Delete</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'accounts' && (
        <>
          {apiDetailUserId && (
            <section className="admin-panel admin-api-detail" style={{ background: colors.cardBackground, borderColor: colors.border, marginBottom: 16 }}>
              <div className="admin-panel-head">
                <h2>User API usage</h2>
                <button type="button" className="header-btn" onClick={() => { setApiDetailUserId(null); setApiDetail(null) }}>
                  Close
                </button>
              </div>
              {apiDetailLoading ? (
                <p className="admin-hint">Loading…</p>
              ) : apiDetail ? (
                <>
                  <p className="admin-hint" style={{ marginTop: 0 }}>
                    <strong>{apiDetail.email}</strong>
                    {apiDetail.name ? ` · ${apiDetail.name}` : ''}
                    {' · Plan: '}{apiDetail.usage.plan}
                  </p>
                  <div className="admin-stat-grid compact" style={{ marginBottom: 16 }}>
                    {[
                      ['Kimem runs (total)', apiDetail.usage.kimem?.totalRuns ?? 0],
                      ['Kimem trial used', apiDetail.usage.kimem ? `${apiDetail.usage.kimem.trialUsed} / ${apiDetail.usage.kimem.trialMax}` : '—'],
                      ['Photo scans', apiDetail.usage.photoScans.unlimited ? `${apiDetail.usage.photoScans.used} (unlimited)` : `${apiDetail.usage.photoScans.used} / ${apiDetail.usage.photoScans.max ?? 0}`],
                      ['Folders', apiDetail.usage.folders.unlimited ? `${apiDetail.usage.folders.used} (unlimited)` : `${apiDetail.usage.folders.used} / ${apiDetail.usage.folders.max ?? 0}`],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="admin-stat-card" style={{ background: colors.cardBackground, borderColor: colors.border }}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {apiDetail.usage.kimem && (
                    <p className="admin-hint">{apiDetail.usage.kimem.remainingLabel}</p>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <strong>Groq API key</strong>
                    {apiDetail.groqApiKey ? (
                      <div className="admin-api-key-reveal">
                        <code>{apiDetail.groqApiKey}</code>
                        <button
                          type="button"
                          className="header-btn"
                          onClick={() => {
                            void navigator.clipboard.writeText(apiDetail.groqApiKey || '')
                            setToast({ message: 'API key copied', type: 'success' })
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <p className="admin-hint">No personal Groq key saved — user is on md-nest trial or has not configured Kimem.</p>
                    )}
                    {apiDetail.groqKeyDisplay && (
                      <p className="admin-hint">Masked: <code>{apiDetail.groqKeyDisplay}</code></p>
                    )}
                  </div>
                </>
              ) : null}
            </section>
          )}

        <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
          {users.length === 0 ? (
            <p className="admin-hint">No users found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Sign-in</th>
                    <th>Docs</th>
                    <th>Kimem</th>
                    <th>Photos</th>
                    <th>Groq key</th>
                    <th>Last seen</th>
                    <th>Plan</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-cell">
                          {user.image ? (
                            <img src={user.image} alt="" className="admin-user-avatar" />
                          ) : (
                            <span className="admin-user-avatar placeholder">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="admin-user-meta">
                            <span className="admin-email-cell">{user.email}</span>
                            <span className="admin-hint" style={{ margin: 0 }}>
                              {user.name || 'No display name'}
                              {user.email_verified ? ' · verified' : ' · unverified'}
                              {' · joined '}{new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-auth-badge${isGoogleUser(user) ? ' google' : ''}`}>
                          {formatAuthProviders(user.auth_providers)}
                        </span>
                      </td>
                      <td>{user.file_count}</td>
                      <td>{user.apiUsage?.kimemUsesTotal ?? 0}</td>
                      <td>{user.apiUsage?.photoConversionsUsed ?? 0}</td>
                      <td>
                        {user.apiUsage?.hasGroqKey ? (
                          <code>{user.apiUsage.groqKeyDisplay || 'gsk_…'}</code>
                        ) : (
                          <span className="admin-hint">—</span>
                        )}
                      </td>
                      <td>
                        {user.last_seen
                          ? new Date(user.last_seen).toLocaleString()
                          : 'Never'}
                      </td>
                      <td>
                        <span className={`admin-plan-badge ${user.plan}`}>{user.plan}</span>
                      </td>
                      <td className="admin-actions-cell">
                        <button
                          type="button"
                          className="header-btn"
                          disabled={loading}
                          onClick={() => loadUserApiDetail(user.id)}
                        >
                          API
                        </button>
                        {user.plan !== 'pro' ? (
                          <button type="button" className="header-btn primary" disabled={loading} onClick={() => assignPlan(user.email, 'pro')}>
                            Make Pro
                          </button>
                        ) : (
                          <button type="button" className="header-btn" disabled={loading} onClick={() => assignPlan(user.email, 'free')}>
                            Set Free
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </>
      )}
    </div>
  )
}

function AnalyticsPanel({
  title,
  children,
  cardBackground,
  borderColor,
}: {
  title: string
  children: ReactNode
  cardBackground: string
  borderColor: string
}) {
  return (
    <section className="admin-panel admin-analytics-panel" style={{ background: cardBackground, borderColor }}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function AnalyticsBar({
  label,
  value,
  total,
  tone = 'brand',
}: {
  label: string
  value: number
  total: number
  tone?: 'brand' | 'pro' | 'google' | 'verified' | 'warn' | 'danger'
}) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0
  return (
    <div className="admin-bar-row">
      <div className="admin-bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="admin-bar-track">
        <div className={`admin-bar-fill ${tone}`} style={{ width: `${width}%` }} />
      </div>
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
  onModerate: (file: AdminFileRow, action: ModerationAction) => void
  loading: boolean
  showModeration?: boolean
}) {
  if (files.length === 0) {
    return <p className="admin-hint">No posts to show.</p>
  }

  return (
    <div className="admin-file-table">
      {files.map((file) => {
        const modStatus = file.moderation_status || 'active'
        const modTone =
          modStatus === 'removed' ? 'danger' : modStatus === 'warned' ? 'warn' : 'neutral'

        return (
          <article key={file.id} className="admin-file-row">
            <div className="admin-file-main">
              <Link href={sitePath(`/file/${file.id}`)} className="admin-file-title">
                {file.title || 'Untitled'}
              </Link>
              <ul className="admin-file-meta-chips" aria-label="Post details">
                <li className={`admin-meta-chip ${file.is_public ? 'is-public' : 'is-private'}`}>
                  {file.is_public ? 'Public' : 'Private'}
                </li>
                <li className="admin-meta-chip">{file.user_id ? 'Signed in' : 'Guest'}</li>
                {modStatus !== 'active' && (
                  <li className={`admin-meta-chip mod-${modTone}`}>{modStatus}</li>
                )}
              </ul>
              {file.user_email && <p className="admin-file-email">{file.user_email}</p>}
              <dl className="admin-file-stats">
                <div>
                  <dt>Views</dt>
                  <dd>{file.view_count}</dd>
                </div>
                <div>
                  <dt>Shares</dt>
                  <dd>{file.share_count}</dd>
                </div>
                <div>
                  <dt>Likes</dt>
                  <dd>{file.like_count}</dd>
                </div>
                <div>
                  <dt>Score</dt>
                  <dd>{file.viral_score}</dd>
                </div>
              </dl>
            </div>
            {showModeration && (
              <div className="admin-file-actions-wrap">
                <p className="admin-file-actions-label">Moderation</p>
                <div className="admin-file-actions">
                  <button
                    type="button"
                    className="header-btn"
                    disabled={loading}
                    onClick={() => onModerate(file, 'warn')}
                  >
                    Warn
                  </button>
                  <button
                    type="button"
                    className="header-btn"
                    disabled={loading}
                    onClick={() => onModerate(file, 'private')}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    className="header-btn admin-btn-takedown"
                    disabled={loading}
                    onClick={() => onModerate(file, 'remove')}
                  >
                    Takedown
                  </button>
                  {modStatus !== 'active' && (
                    <button
                      type="button"
                      className="header-btn primary admin-btn-restore"
                      disabled={loading}
                      onClick={() => onModerate(file, 'restore')}
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
