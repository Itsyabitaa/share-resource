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

const QUICK_ACTIONS: { id: KimemAction; label: string; hint: string }[] = [
  { id: 'create', label: 'Create', hint: 'Draft new markdown from your brief' },
  { id: 'edit', label: 'Edit', hint: 'Change tone, fix wording, expand sections' },
  { id: 'analyze', label: 'Analyze', hint: 'Structure, clarity, and improvement tips' },
  { id: 'restructure', label: 'Restructure', hint: 'Better headings and flow' },
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
  const [action, setAction] = useState<KimemAction>('edit')
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

  const runKimem = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await apiFetch(apiPath('/kimem-ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, instruction, markdown, title }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Kimem AI request failed')
        if (data.code === 'kimem_trial_exhausted') {
          await loadStatus()
        }
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

  if (userPlan !== 'pro') {
    return (
      <div className="kimem-panel kimem-panel--compact">
        <p className="kimem-panel__teaser">
          <strong>{KIMEM_AI_NAME}</strong> — Pro markdown assistant (create, edit, analyze, restructure).{' '}
          <Link href={sitePath('/pricing')}>Upgrade to Pro</Link>
        </p>
      </div>
    )
  }

  const keysUrl = status?.apiKeysUrl || GROQ_API_KEYS_URL
  const onTrial = status && !status.hasOwnKey && status.trialRemaining > 0
  const trialDone = status && !status.hasOwnKey && status.trialRemaining <= 0

  return (
    <div className={`kimem-panel${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="kimem-panel__toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="kimem-panel__badge">Pro</span>
        <span className="kimem-panel__title">{KIMEM_AI_NAME}</span>
        <span className="kimem-panel__chevron">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="kimem-panel__body">
          {onTrial && (
            <div className="kimem-panel__notice kimem-panel__notice--trial">
              <strong>Try Kimem with md-nest&apos;s API</strong> —{' '}
              {status.trialRemaining} of {status.trialMax} trial runs left. When you&apos;re ready for
              unlimited use, add your own Groq key below (Settings has the same steps).
            </div>
          )}

          {status?.hasOwnKey && (
            <div className="kimem-panel__notice kimem-panel__notice--ok">
              Using your Groq API key — unlimited Kimem AI on your account.
            </div>
          )}

          {(trialDone || error?.includes('trial')) && (
            <div className="kimem-panel__notice kimem-panel__notice--warn">
              {status?.blockedReason ||
                'Trial finished. Follow the steps below and paste your key in Settings to continue.'}
            </div>
          )}

          <details className="kimem-panel__steps" open={!status?.hasOwnKey}>
            <summary>Get your Groq API key (to continue after the trial)</summary>
            <ol>
              <li>
                Open{' '}
                <a href={keysUrl} target="_blank" rel="noopener noreferrer">
                  console.groq.com/keys
                </a>{' '}
                and sign in.
              </li>
              <li>Create an API key (starts with gsk_ — copy it once).</li>
              <li>
                Paste it in{' '}
                <Link href={sitePath('/settings#kimem-ai')}>Settings → Kimem AI</Link>.
              </li>
              <li>Come back here — Kimem uses your key and you keep working.</li>
            </ol>
          </details>

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
            What should Kimem do?
          </label>
          <textarea
            id="kimem-instruction"
            className="kimem-panel__input"
            rows={3}
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder={
              action === 'create'
                ? 'e.g. Outline a blog post about sustainable design…'
                : action === 'analyze'
                  ? 'Optional: focus on headings and readability'
                  : 'e.g. Make this shorter and fix grammar'
            }
          />

          <div className="kimem-panel__toolbar">
            <button
              type="button"
              className="header-btn primary kimem-run"
              disabled={loading || (status != null && !status.canUseKimem)}
              onClick={runKimem}
            >
              {loading ? 'Kimem is thinking…' : 'Run Kimem AI'}
            </button>
            {!status?.hasOwnKey && (
              <Link href={sitePath('/settings#kimem-ai')} className="ghost-btn">
                Paste API key
              </Link>
            )}
          </div>

          {error && <p className="kimem-panel__error">{error}</p>}

          {result && (
            <div className="kimem-panel__result">
              <div className="kimem-panel__result-head">
                <span>{result.kind === 'markdown' ? 'Suggested markdown' : 'Analysis'}</span>
                {result.kind === 'markdown' && (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => onApplyMarkdown(result.content)}
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
  )
}
