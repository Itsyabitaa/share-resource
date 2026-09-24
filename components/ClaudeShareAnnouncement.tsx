import { useEffect, useState } from 'react'
import { useSession } from '../lib/auth-client'
import { useAppPaths } from '../lib/appPaths'

const DISMISS_KEY = 'mdnest-claude-announce-dismissed'

const STEPS = [
  'In Claude, open Customize, then Connectors, then Add custom connector.',
  'Paste https://mdnest.vercel.app/api/mcp',
  'Select Sign in now.',
  'Select Register automatically.',
  'Click Add, then Connect.',
  'Sign in with this md-nest account and click Allow Claude. You become the owner of every note Claude shares.',
  'In a chat, type: Share this document to md-nest.',
  'Click Allow. The link is public. It lives in your workspace.',
]

export default function ClaudeShareAnnouncement() {
  const { data: session } = useSession()
  const { apiPath } = useAppPaths()
  const [isPro, setIsPro] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setIsPro(false)
      return
    }
    fetch(apiPath('/profile'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsPro(data?.plan === 'pro'))
      .catch(() => setIsPro(false))
  }, [session?.user?.id, apiPath])

  if (!session?.user || !isPro) return null

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://mdnest.vercel.app/api/mcp')
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {!dismissed && (
        <div className="claude-announce" role="status">
          <div className="claude-announce-copy">
            <span className="claude-announce-badge">Pro</span>
            <p>
              <strong>Share from Claude.</strong> One click turns a Claude note into your md-nest link.
            </p>
          </div>
          <div className="claude-announce-actions">
            <button type="button" className="claude-announce-try" onClick={() => setGuideOpen(true)}>
              Try it
            </button>
            <button
              type="button"
              className="claude-announce-close"
              aria-label="Dismiss announcement"
              onClick={() => {
                window.localStorage.setItem(DISMISS_KEY, '1')
                setDismissed(true)
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {guideOpen && (
        <div className="claude-guide-backdrop" onClick={() => setGuideOpen(false)}>
          <div
            className="claude-guide"
            role="dialog"
            aria-labelledby="claude-guide-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="claude-announce-badge">Pro guide</p>
            <h2 id="claude-guide-title">Connect Claude</h2>
            <p className="claude-guide-lead">
              Notes are saved to the md-nest account you allow. You own them. Anyone with the link can read them.
            </p>
            <ol>
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button type="button" className="claude-guide-copy" onClick={copyUrl}>
              Copy connector URL
            </button>
            <button type="button" className="claude-announce-try" onClick={() => setGuideOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
