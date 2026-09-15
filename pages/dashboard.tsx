import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'
import { daysUntilExpiry } from '../lib/storagePolicy'
import type { UserDashboardActivity, UserDashboardFile, UserDashboardStats } from '../lib/userDashboard'
import type { UserPlan } from '../lib/storagePolicy'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function UserDashboardPage() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<UserPlan>('free')
  const [stats, setStats] = useState<UserDashboardStats | null>(null)
  const [recentFiles, setRecentFiles] = useState<UserDashboardFile[]>([])
  const [topFiles, setTopFiles] = useState<UserDashboardFile[]>([])
  const [activity, setActivity] = useState<UserDashboardActivity[]>([])
  const [warningCount, setWarningCount] = useState(0)

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`${sitePath('/login')}?redirect=${encodeURIComponent('/dashboard')}`)
    }
  }, [session, isPending, router, sitePath])

  useEffect(() => {
    if (!session?.user) return

    setLoading(true)
    fetch(apiPath('/user/dashboard'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setPlan(data.plan === 'pro' ? 'pro' : 'free')
        setStats(data.stats)
        setRecentFiles(data.recentFiles || [])
        setTopFiles(data.topFiles || [])
        setActivity(data.activity || [])
        setWarningCount(data.warningCount || 0)
      })
      .finally(() => setLoading(false))
  }, [session?.user?.id, apiPath])

  if (!session) return null

  const displayName = session.user.name || session.user.email?.split('@')[0] || 'there'

  return (
    <div className="page-shell user-dashboard" style={{ color: colors.text }}>
      <header className="user-dashboard-hero">
        <div>
          <p className="composer-kicker">Your nest</p>
          <h1 className="page-title">Hi, {displayName}</h1>
          <p className="page-subtitle">
            Your personal dashboard — documents, stats, and activity in one place.
          </p>
        </div>
        <div className="user-dashboard-hero-actions">
          <span className={`user-plan-badge ${plan}`}>{plan === 'pro' ? 'Pro' : 'Free'}</span>
          <Link href={sitePath('/')} className="header-btn primary">
            New document
          </Link>
        </div>
      </header>

      {warningCount > 0 && (
        <div className="user-dashboard-alert">
          <strong>Community guidelines:</strong> You have {warningCount} warning
          {warningCount === 1 ? '' : 's'}. Please review our rules before posting again.
        </div>
      )}

      {plan !== 'pro' && stats && stats.expiring_soon > 0 && (
        <div className="user-dashboard-alert warn">
          <strong>{stats.expiring_soon} document{stats.expiring_soon === 1 ? '' : 's'} expiring soon.</strong>{' '}
          <Link href={sitePath('/pricing')}>Upgrade to Pro</Link> for permanent storage.
        </div>
      )}

      {loading ? (
        <p className="admin-hint">Loading your dashboard...</p>
      ) : stats ? (
        <>
          <section className="user-dashboard-section">
            <h2 className="admin-block-title">At a glance</h2>
            <div className="admin-stat-grid">
              {[
                ['Documents', stats.total_files],
                ['Public', stats.public_files],
                ['Private', stats.private_files],
                ['Folders', stats.folder_count],
                ['Total views', stats.total_views],
                ['Total shares', stats.total_shares],
                ['Edits', stats.total_edits],
                ['Expiring soon', stats.expiring_soon],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="admin-stat-card"
                  style={{ background: colors.cardBackground, borderColor: colors.border }}
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="user-dashboard-split">
            <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
              <div className="admin-panel-head">
                <h2>Recent documents</h2>
                <Link href={sitePath('/workspace')} className="admin-link-btn">
                  Open workspace
                </Link>
              </div>
              {recentFiles.length === 0 ? (
                <p className="admin-hint">
                  No documents yet.{' '}
                  <Link href={sitePath('/')}>Create your first one</Link>.
                </p>
              ) : (
                <div className="user-doc-list">
                  {recentFiles.map((file) => (
                    <UserDocRow key={file.id} file={file} sitePath={sitePath} />
                  ))}
                </div>
              )}
            </section>

            <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
              <div className="admin-panel-head">
                <h2>Top performing</h2>
                <span className="admin-hint" style={{ margin: 0 }}>By views</span>
              </div>
              {topFiles.length === 0 ? (
                <p className="admin-hint">Share a document to start tracking views.</p>
              ) : (
                <div className="user-doc-list">
                  {topFiles.map((file) => (
                    <UserDocRow key={file.id} file={file} sitePath={sitePath} showStats />
                  ))}
                </div>
              )}
            </section>
          </div>

          {stats.expiring_soon_list.length > 0 && (
            <section className="admin-panel user-dashboard-expiring" style={{ background: colors.cardBackground, borderColor: colors.border }}>
              <h2>Expiring within 7 days</h2>
              <div className="user-doc-list">
                {stats.expiring_soon_list.map((file) => (
                  <UserDocRow key={file.id} file={file} sitePath={sitePath} showExpiry />
                ))}
              </div>
            </section>
          )}

          <section className="admin-panel" style={{ background: colors.cardBackground, borderColor: colors.border }}>
            <div className="admin-panel-head">
              <h2>Recent activity</h2>
            </div>
            {activity.length === 0 ? (
              <p className="admin-hint">Edits and updates will show up here.</p>
            ) : (
              <div className="admin-activity-list">
                {activity.map((item) => (
                  <div key={item.id} className="admin-activity-row">
                    <div className="admin-activity-main">
                      <strong>{item.label}</strong>
                      <div className="admin-hint">
                        {item.file_title || 'Document'}
                      </div>
                    </div>
                    <time>{new Date(item.at).toLocaleString()}</time>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="user-dashboard-quick">
            <Link href={sitePath('/workspace')} className="header-btn">Workspace</Link>
            <Link href={sitePath('/settings')} className="header-btn">Settings</Link>
            {plan !== 'pro' && (
              <Link href={sitePath('/pricing')} className="header-btn primary">Upgrade to Pro</Link>
            )}
          </div>
        </>
      ) : (
        <p className="admin-hint">Could not load dashboard. Try refreshing.</p>
      )}
    </div>
  )
}

function UserDocRow({
  file,
  sitePath,
  showStats = false,
  showExpiry = false,
}: {
  file: UserDashboardFile
  sitePath: (path: string) => string
  showStats?: boolean
  showExpiry?: boolean
}) {
  const daysLeft = daysUntilExpiry(file.expires_at)

  return (
    <div className="user-doc-row">
      <div className="user-doc-main">
        <Link href={sitePath(`/file/${file.id}`)} className="admin-file-title">
          {file.title || 'Untitled'}
        </Link>
        <div className="admin-hint">
          {file.is_public ? 'Public' : 'Private'}
          {showStats && ` · ${file.view_count} views · ${file.share_count} shares`}
          {showExpiry && daysLeft !== null && ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          {!showStats && !showExpiry && ` · ${formatDate(file.created_at)}`}
          {file.moderation_status === 'warned' ? ' · warned' : ''}
        </div>
      </div>
      <Link href={sitePath(`/edit/${file.id}`)} className="header-btn">
        Edit
      </Link>
    </div>
  )
}
