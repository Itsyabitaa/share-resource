import { useEffect, useState } from 'react'
import { useSession } from '../lib/auth-client'
import { useAppPaths } from '../lib/appPaths'
import type { SiteAnnouncement } from '../lib/announcementTypes'

function matchesAudience(audience: SiteAnnouncement['audience'], signedIn: boolean, plan: 'free' | 'pro' | null) {
  if (audience === 'all') return true
  if (audience === 'guests') return !signedIn
  if (audience === 'signed_in') return signedIn
  if (audience === 'free') return signedIn && plan === 'free'
  if (audience === 'pro') return signedIn && plan === 'pro'
  return false
}

export default function SiteAnnouncements() {
  const { data: session } = useSession()
  const { apiPath } = useAppPaths()
  const [items, setItems] = useState<SiteAnnouncement[]>([])
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null)
  const [hidden, setHidden] = useState<string[]>([])
  const [popup, setPopup] = useState<SiteAnnouncement | null>(null)
  const [guide, setGuide] = useState<SiteAnnouncement | null>(null)

  useEffect(() => {
    fetch(apiPath('/announcements'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setItems(data?.announcements || []))
      .catch(() => setItems([]))
  }, [apiPath])

  useEffect(() => {
    if (!session?.user) {
      setPlan(null)
      return
    }
    fetch(apiPath('/profile'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPlan(data?.plan === 'pro' ? 'pro' : 'free'))
      .catch(() => setPlan('free'))
  }, [session?.user?.id, apiPath])

  useEffect(() => {
    const dismissed = window.localStorage.getItem('mdnest-announce-hidden')
    setHidden(dismissed ? dismissed.split(',') : [])
  }, [])

  const visible = items.filter((item) => matchesAudience(item.audience, !!session?.user, plan) && !hidden.includes(item.id))
  const banners = visible.filter((item) => item.display === 'banner' || item.display === 'both')
  const popupCandidate = visible.find((item) => item.display === 'popup' || item.display === 'both')

  useEffect(() => {
    if (!popupCandidate) return
    const seen = window.sessionStorage.getItem(`mdnest-announce-popup-${popupCandidate.id}`)
    if (!seen) setPopup(popupCandidate)
  }, [popupCandidate?.id])

  const hide = (id: string) => {
    const next = Array.from(new Set([...hidden, id]))
    setHidden(next)
    window.localStorage.setItem('mdnest-announce-hidden', next.join(','))
    if (popup?.id === id) setPopup(null)
  }

  const openAction = (item: SiteAnnouncement) => {
    if (item.guideSteps.length > 0) {
      setGuide(item)
      return
    }
    if (item.ctaUrl) window.location.href = item.ctaUrl
  }

  return (
    <>
      {banners.map((item) => (
        <div key={item.id} className={`site-announce is-${item.placement} tone-${item.color}`} role="status">
          <div>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
          </div>
          <div className="site-announce-actions">
            {item.ctaLabel && (item.guideSteps.length > 0 || item.ctaUrl) && (
              <button type="button" onClick={() => openAction(item)}>{item.ctaLabel}</button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => hide(item.id)}>×</button>
          </div>
        </div>
      ))}

      {(popup || guide) && (
        <div className="site-announce-backdrop" onClick={() => { setPopup(null); setGuide(null) }}>
          <div
            className={`site-announce-modal tone-${(guide || popup)!.color}`}
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{(guide || popup)!.title}</h2>
            <p>{(guide || popup)!.message}</p>
            {(guide || popup)!.guideSteps.length > 0 && (
              <ol>
                {(guide || popup)!.guideSteps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            )}
            <div className="site-announce-actions">
              {popup && !guide && popup.ctaLabel && (popup.guideSteps.length > 0 || popup.ctaUrl) && (
                <button type="button" onClick={() => openAction(popup)}>{popup.ctaLabel}</button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (popup) window.sessionStorage.setItem(`mdnest-announce-popup-${popup.id}`, '1')
                  setPopup(null)
                  setGuide(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
