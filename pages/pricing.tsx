import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTheme } from '../lib/ThemeContext'
import { useSession } from '../lib/auth-client'
import { useAppPaths } from '../lib/appPaths'
import { PLAN_DEFINITIONS } from '../lib/plans'
import Toast from '../components/Toast'

export default function PricingPage() {
  const { colors } = useTheme()
  const { data: session } = useSession()
  const { sitePath, apiPath } = useAppPaths()
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch(apiPath('/plan'))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.plan) setPlan(data.plan)
      })
      .catch(() => {})
  }, [apiPath, session?.user?.id])

  const handleUpgrade = async () => {
    setUpgrading(true)
    setToast(null)

    try {
      const res = await fetch(apiPath('/plan/upgrade'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: promoCode || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setToast({ message: data.error || 'Upgrade failed', type: 'error' })
        return
      }

      setPlan('pro')
      setToast({ message: data.message || 'Upgraded to Pro!', type: 'success' })
    } catch {
      setToast({ message: 'Network error while upgrading', type: 'error' })
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <div className="page-shell wide pricing-page" style={{ color: colors.text }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <header style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 40px' }}>
        <p className="composer-kicker">Pricing</p>
        <h1 className="page-title">Choose how long your nest stays</h1>
        <p className="page-subtitle">
          Guests get a quick 3-day link. Free accounts keep documents for 30 days.
          Pro keeps everything permanently.
        </p>
      </header>

      <div className="pricing-grid">
        {PLAN_DEFINITIONS.map((tier) => {
          const isCurrent =
            (tier.id === 'guest' && !session?.user) ||
            (tier.id === 'free' && session?.user && plan === 'free') ||
            (tier.id === 'pro' && plan === 'pro')

          const href = tier.id === 'pro' && session?.user
            ? '#upgrade'
            : sitePath(tier.ctaHref)

          return (
            <article
              key={tier.id}
              className={`pricing-card${tier.highlighted ? ' is-highlighted' : ''}${isCurrent ? ' is-current' : ''}`}
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.cardBackground,
              }}
            >
              {tier.highlighted && <span className="pricing-badge">Best value</span>}
              {isCurrent && <span className="pricing-badge current">Current plan</span>}

              <h2 style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: '1.5rem',
                marginBottom: 8,
              }}>
                {tier.name}
              </h2>

              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: '2rem', fontWeight: 700 }}>{tier.price}</span>
                <span style={{ opacity: 0.65, marginLeft: 8 }}>{tier.priceNote}</span>
              </div>

              <p style={{ opacity: 0.85, marginBottom: 16, minHeight: 48 }}>{tier.description}</p>

              <div className="pricing-retention" style={{
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 20,
                background: 'rgba(120, 113, 108, 0.08)',
                fontWeight: 600,
              }}>
                Storage: {tier.retention}
              </div>

              <ul className="pricing-features">
                {tier.features.map(feature => (
                  <li key={feature.label} style={{ opacity: feature.included ? 1 : 0.45 }}>
                    <span aria-hidden="true">{feature.included ? '✓' : '—'}</span>
                    {feature.label}
                  </li>
                ))}
              </ul>

              {tier.id === 'pro' && session?.user && plan === 'pro' ? (
                <button type="button" className="header-btn" disabled style={{ width: '100%', marginTop: 20 }}>
                  You&apos;re on Pro
                </button>
              ) : tier.id === 'pro' && session?.user ? (
                <a href="#upgrade" className="header-btn primary" style={{ display: 'block', textAlign: 'center', marginTop: 20 }}>
                  {tier.cta}
                </a>
              ) : (
                <Link href={href} className={`header-btn${tier.highlighted ? ' primary' : ''}`} style={{ display: 'block', textAlign: 'center', marginTop: 20 }}>
                  {tier.cta}
                </Link>
              )}
            </article>
          )
        })}
      </div>

      {session?.user && plan !== 'pro' && (
        <section id="upgrade" className="pricing-upgrade" style={{
          marginTop: 48,
          padding: 28,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          background: colors.cardBackground,
        }}>
          <h2 style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '1.35rem',
            marginBottom: 8,
          }}>
            Upgrade to Pro
          </h2>
          <p style={{ opacity: 0.85, marginBottom: 20 }}>
            Unlock permanent storage and Share from Claude. Notes Claude publishes are saved to your Pro account.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Promo code (if you have one)"
              style={{
                flex: '1 1 220px',
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.inputBackground,
                color: colors.text,
              }}
            />
            <button
              type="button"
              className="header-btn primary"
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? 'Upgrading...' : 'Upgrade now'}
            </button>
          </div>

          <p style={{ opacity: 0.6, fontSize: 14, marginTop: 16, marginBottom: 0 }}>
            Payment integration can be wired in later. For now, use a promo code or enable
            self-serve Pro in your deployment settings.
          </p>
        </section>
      )}

      <section style={{ marginTop: 48, maxWidth: 760, marginInline: 'auto' }}>
        <h2 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: '1.25rem',
          marginBottom: 16,
        }}>
          How retention works
        </h2>
        <div style={{
          display: 'grid',
          gap: 12,
        }}>
          {[
            'Guest links are deleted automatically after 3 days.',
            'Free accounts keep each document for 30 days from the save date.',
            'Pro accounts never expire — documents stay until you delete them.',
            'Expired files are removed from storage during nightly cleanup.',
          ].map(item => (
            <p key={item} style={{
              margin: 0,
              padding: '14px 16px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.cardBackground,
              opacity: 0.9,
            }}>
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  )
}
