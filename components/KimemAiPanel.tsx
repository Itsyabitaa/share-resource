import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppPaths } from '../lib/appPaths'
import { apiFetch } from '../lib/apiFetch'
import { KIMEM_AI_NAME, GROQ_API_KEYS_URL, type KimemAction } from '../lib/kimemAi'

type KimemStatus = {
  hasKey: boolean
  hasOwnKey: boolean
  canUseKimem: boolean
  trialUsed: number
  trialMax: number
  trialRemaining: number
  platformConfigured: boolean
  apiKeysUrl?: string
  blockedReason?: string
}

const QUICK_ACTIONS: { id: KimemAction; label: string; hint: string; oneClick?: boolean }[] = [
  { id: 'rephrase', label: 'Rephrase', hint: 'Better wording — same structure', oneClick: true },
  { id: 'restructure', label: 'Structure', hint: 'Reorder sections — keep your words', oneClick: true },
  { id: 'create', label: 'Create', hint: 'Draft from a brief' },
  { id: 'analyze', label: 'Analyze', hint: 'Tips on clarity and layout' },
  { id: 'edit', label: 'Custom edit', hint: 'Your instruction, any change' },
]

export default function KimemAiPanel({
  markdown,
  title,
  userPlan,
  onApplyMarkdown,
}: {
  markdown: string
  title: string
  userPlan: 'free' | 'pro' | null
  onApplyMarkdown: (next: string) => void
}) {
  const { apiPath, sitePath } = useAppPaths()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<KimemStatus | null>(null)
  const [action, setAction] = useState<KimemAction>('rephrase')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ kind: 'markdown' | 'text'; content: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    if (userPlan !== 'pro') return
    try {
      const res = await apiFetch(apiPath('/kimem-ai/key'))
      if (res.ok) setStatus(await res.json())
    } catch {
      /* ignore */
    }
  }, [apiPath, userPlan])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const runKimem = async (overrideAction?: KimemAction, overrideInstruction?: string) => {
    const act = overrideAction ?? action
    const instr = overrideInstruction ?? instruction
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await apiFetch(apiPath('/kimem-ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act, instruction: instr, markdown, title }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Kimem AI request failed')
        if (data.code === 'kimem_trial_exhausted') await loadStatus()
        return
      }
      setResult({ kind: data.kind, content: data.content })
      if (typeof data.trialUsed === 'number') {
        setStatus(prev =>
          prev
            ? {
                ...prev,
                trialUsed: data.trialUsed,
                trialRemaining: data.trialRemaining ?? prev.trialRemaining,
                hasOwnKey: data.hasOwnKey ?? prev.hasOwnKey,
              }
            : prev
        )
      }
    } catch {
      setError('Could not reach Kimem AI. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const keysUrl = status?.apiKeysUrl || GROQ_API_KEYS_URL
  const onTrial = status && !status.hasOwnKey && status.trialRemaining > 0
  const trialDone = status && !status.hasOwnKey && status.trialRemaining <= 0
  const isPro = userPlan === 'pro'

  return (
    <>
      <button
        type="button"
        className={`kimem-fab${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={`Open ${KIMEM_AI_NAME}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className="kimem-fab__icon" aria-hidden>
          ✦
        </span>
        <span className="kimem-fab__label">{KIMEM_AI_NAME}</span>
        {isPro && <span className="kimem-fab__dot" title="AI available" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="kimem-backdrop"
            aria-label="Close Kimem AI"
            onClick={() => setOpen(false)}
          />
          <div className="kimem-sheet" role="dialog" aria-labelledby="kimem-sheet-title">
            <div className="kimem-sheet__head">
              <div>
                <p className="kimem-sheet__kicker">Pro assistant</p>
                <h2 id="kimem-sheet-title">{KIMEM_AI_NAME}</h2>
              </div>
              <button type="button" className="kimem-sheet__close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            {!isPro ? (
              <div className="kimem-sheet__body">
                <p>
                  Rephrase, fix structure, analyze, and draft markdown with AI.{' '}
                  <Link href={sitePath('/pricing')}>Upgrade to Pro</Link> to unlock Kimem.
                </p>
              </div>
            ) : (
              <div className="kimem-sheet__body">
                {onTrial && (
                  <div className="kimem-panel__notice kimem-panel__notice--trial">
                    <strong>Trial</strong> — {status.trialRemaining} of {status.trialMax} runs left on md-nest.
                    Add your Groq key in <Link href={sitePath('/settings#kimem-ai')}>Settings</Link> for unlimited use.
                  </div>
                )}
                {status?.hasOwnKey && (
                  <div className="kimem-panel__notice kimem-panel__notice--ok">
                    Using your Groq key — unlimited runs.
                  </div>
                )}
                {(trialDone || error?.includes('trial')) && (
                  <div className="kimem-panel__notice kimem-panel__notice--warn">
                    {status?.blockedReason || 'Trial finished — add a Groq key in Settings.'}
                  </div>
                )}

                <div className="kimem-quick-row">
                  <button
                    type="button"
                    className="kimem-quick-btn"
                    disabled={loading || !markdown.trim() || (status != null && !status.canUseKimem)}
                    onClick={() => {
                      setAction('rephrase')
                      void runKimem('rephrase', instruction || 'Polish wording. Keep the same structure and headings.')
                    }}
                  >
                    <strong>Rephrase</strong>
                    <span>Same layout, better words</span>
                  </button>
                  <button
                    type="button"
                    className="kimem-quick-btn"
                    disabled={loading || !markdown.trim() || (status != null && !status.canUseKimem)}
                    onClick={() => {
                      setAction('restructure')
                      void runKimem(
                        'restructure',
                        instruction || 'Reorder headings and sections only. Do not rephrase sentences.'
                      )
                    }}
                  >
                    <strong>Fix structure</strong>
                    <span>Reorder sections, keep wording</span>
                  </button>
                </div>

                <div className="kimem-panel__actions">
                  {QUICK_ACTIONS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`kimem-chip${action === item.id ? ' is-on' : ''}`}
                      title={item.hint}
                      onClick={() => setAction(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="kimem-panel__label" htmlFor="kimem-instruction">
                  Optional instructions
                </label>
                <textarea
                  id="kimem-instruction"
                  className="kimem-panel__input"
                  rows={3}
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder={
                    action === 'rephrase'
                      ? 'e.g. Shorter sentences, friendlier tone…'
                      : action === 'restructure'
                        ? 'e.g. Put summary first, group FAQs…'
                        : action === 'create'
                          ? 'What should Kimem write?'
                          : 'Tell Kimem what to change…'
                  }
                />

                <div className="kimem-panel__toolbar">
                  <button
                    type="button"
                    className="header-btn primary kimem-run"
                    disabled={loading || (status != null && !status.canUseKimem)}
                    onClick={() => runKimem()}
                  >
                    {loading ? 'Kimem is thinking…' : 'Run'}
                  </button>
                  {!status?.hasOwnKey && (
                    <Link href={sitePath('/settings#kimem-ai')} className="ghost-btn">
                      Groq key
                    </Link>
                  )}
                </div>

                <details className="kimem-panel__steps">
                  <summary>Get your Groq API key</summary>
                  <ol>
                    <li>
                      <a href={keysUrl} target="_blank" rel="noopener noreferrer">
                        console.groq.com/keys
                      </a>
                    </li>
                    <li>Paste in <Link href={sitePath('/settings#kimem-ai')}>Settings → Kimem AI</Link></li>
                  </ol>
                </details>

                {error && <p className="kimem-panel__error">{error}</p>}

                {result && (
                  <div className="kimem-panel__result">
                    <div className="kimem-panel__result-head">
                      <span>{result.kind === 'markdown' ? 'Result' : 'Analysis'}</span>
                      {result.kind === 'markdown' && (
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            onApplyMarkdown(result.content)
                            setOpen(false)
                          }}
                        >
                          Apply to editor
                        </button>
                      )}
                    </div>
                    <pre className="kimem-panel__result-body">{result.content}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
