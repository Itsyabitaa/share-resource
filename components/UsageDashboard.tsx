import Link from 'next/link'
import type { UserUsageSummary } from '../lib/usageSummary'
import { KIMEM_AI_NAME } from '../lib/kimemAi'

function meterPercent(used: number, max: number | null) {
  if (max == null || max <= 0) return 0
  return Math.min(100, Math.round((used / max) * 100))
}

function UsageRow({
  title,
  used,
  max,
  remaining,
  unlimited,
  hint,
  href,
}: {
  title: string
  used: number
  max: number | null
  remaining: number | null
  unlimited: boolean
  hint?: string
  href?: string
}) {
  const pct = unlimited ? 100 : meterPercent(used, max)

  return (
    <div className="usage-row">
      <div className="usage-row-head">
        <strong>{title}</strong>
        <span className="usage-row-nums">
          {unlimited ? (
            <>Used: {used} · Unlimited</>
          ) : (
            <>
              {used} / {max ?? 0} used · {remaining ?? 0} left
            </>
          )}
        </span>
      </div>
      <div className="usage-meter" aria-hidden={unlimited}>
        <div
          className={`usage-meter-fill${pct >= 90 && !unlimited ? ' is-warn' : ''}`}
          style={{ width: unlimited ? '100%' : `${pct}%` }}
        />
      </div>
      {hint && <p className="usage-row-hint">{hint}</p>}
      {href && (
        <Link href={href} className="usage-row-link">
          Manage
        </Link>
      )}
    </div>
  )
}

export default function UsageDashboard({
  usage,
  sitePath,
}: {
  usage: UserUsageSummary
  sitePath: (path: string) => string
}) {
  const { kimem, photoScans, folders, plan } = usage

  return (
    <section className="user-dashboard-section">
      <div className="admin-panel-head" style={{ marginBottom: '1rem' }}>
        <h2 className="admin-block-title" style={{ margin: 0 }}>
          API usage &amp; limits
        </h2>
        <span className="admin-hint" style={{ margin: 0 }}>
          {plan === 'pro' ? 'Pro plan' : 'Free plan'}
        </span>
      </div>

      <div className="usage-dashboard-panel">
        {plan === 'pro' && kimem ? (
          <UsageRow
            title={`${KIMEM_AI_NAME} (Groq)`}
            used={kimem.hasOwnGroqKey ? kimem.totalRuns : kimem.trialUsed}
            max={kimem.hasOwnGroqKey ? null : kimem.trialMax}
            remaining={kimem.hasOwnGroqKey ? null : kimem.trialRemaining}
            unlimited={kimem.hasOwnGroqKey}
            hint={kimem.remainingLabel}
            href={sitePath('/settings#kimem-ai')}
          />
        ) : (
          <div className="usage-row usage-row--muted">
            <strong>{KIMEM_AI_NAME}</strong>
            <p className="usage-row-hint">
              Pro only.{' '}
              <Link href={sitePath('/pricing')}>Upgrade</Link> for AI create, edit, and analyze.
            </p>
          </div>
        )}

        <UsageRow
          title={photoScans.label}
          used={photoScans.used}
          max={photoScans.max}
          remaining={photoScans.remaining}
          unlimited={photoScans.unlimited}
          hint={
            photoScans.unlimited
              ? 'Unlimited photo → markdown on Pro.'
              : 'Free plan photo scans (lifetime per account).'
          }
          href={sitePath('/')}
        />

        <UsageRow
          title={folders.label}
          used={folders.used}
          max={folders.max}
          remaining={folders.remaining}
          unlimited={folders.unlimited}
          hint={
            folders.unlimited
              ? 'Create as many folders as you need.'
              : `Free plan includes ${folders.max ?? 1} folder.`
          }
          href={sitePath('/workspace')}
        />

        {plan === 'pro' && kimem && (
          <p className="usage-footnote">
            Total Kimem runs (all time): <strong>{kimem.totalRuns}</strong>
            {kimem.hasOwnGroqKey ? ' · Billed by Groq on your account' : ' · Trial uses md-nest Groq key'}
          </p>
        )}
      </div>
    </section>
  )
}
