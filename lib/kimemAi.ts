export type KimemAction = 'create' | 'edit' | 'rephrase' | 'analyze' | 'restructure' | 'chat'

export const GROQ_API_KEYS_URL = 'https://console.groq.com/keys'
export const GROQ_API_BASE = 'https://api.groq.com/openai/v1'

export const KIMEM_AI_NAME = 'Kimem AI'

/** Groq retired llama-3.3-70b-versatile Aug 2026 — see console.groq.com/docs/deprecations */
export const GROQ_MODEL_FALLBACKS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'qwen/qwen3.6-27b',
  'llama-3.1-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
] as const

export function getGroqModelCandidates(preferred?: string): string[] {
  const fromEnv = process.env.KIMEM_GROQ_MODEL?.trim()
  const ordered = [preferred, fromEnv, ...GROQ_MODEL_FALLBACKS].filter(
    (m): m is string => !!m?.trim()
  )
  return [...new Set(ordered)]
}

export const DEFAULT_GROQ_MODEL =
  process.env.KIMEM_GROQ_MODEL?.trim() || GROQ_MODEL_FALLBACKS[0]

const SYSTEM_PROMPT = `You are Kimem AI, a focused markdown assistant inside md-nest.
You help users write, edit, analyze, and restructure markdown documents.
Rules:
- Prefer clean, portable CommonMark-style markdown (headings, lists, links, code fences when needed).
- Preserve the author's voice unless they ask for a tone change.
- Do not invent facts; if information is missing, say so in analysis mode or use placeholders in draft mode.
- Never wrap markdown output in code fences unless the user asked for a code block inside the document.
- Do not include meta commentary when the user expects document markdown as the reply.`

function buildUserMessage(action: KimemAction, instruction: string, markdown: string, title?: string) {
  const doc = markdown.trim()
  const titleLine = title?.trim() ? `Document title: ${title.trim()}\n\n` : ''

  switch (action) {
    case 'create':
      return `${titleLine}Task: Create new markdown from the user's brief.\n\nUser brief:\n${instruction || 'Write a useful starter document.'}\n\n${
        doc ? `Optional context from their draft (you may replace or extend):\n${doc}` : ''
      }\n\nReply with ONLY the markdown document.`
    case 'edit':
      return `${titleLine}Task: Edit the markdown per the user's instruction. Keep structure sensible.\n\nInstruction:\n${instruction}\n\nCurrent markdown:\n${doc || '(empty)'}\n\nReply with ONLY the full updated markdown.`
    case 'rephrase':
      return `${titleLine}Task: REPHRASE the markdown — polish wording, grammar, and clarity.
Rules:
- Keep the SAME structure: same headings, section order, and list shape.
- Do not reorder sections, merge/split blocks, or rewrite for a new outline.
- Preserve meaning and tone unless the user asks otherwise.
${instruction ? `User guidance:\n${instruction}\n\n` : ''}Current markdown:\n${doc || '(empty)'}\n\nReply with ONLY the rephrased markdown.`
    case 'restructure':
      return `${titleLine}Task: Adjust STRUCTURE ONLY — headings hierarchy, section order, grouping, lists.
Rules:
- Do NOT rephrase body text; keep original sentences and wording.
- Only move/relabel/split/merge sections when needed for clearer organization.
- Minimal connector words allowed when moving a paragraph (e.g. fix a broken reference).
${instruction ? `User guidance:\n${instruction}\n\n` : ''}Current markdown:\n${doc || '(empty)'}\n\nReply with ONLY the restructured markdown.`
    case 'analyze':
      return `${titleLine}Task: Analyze this markdown (structure, clarity, gaps, tone, SEO/readability tips). Be concise and actionable.\n\n${
        instruction ? `Focus areas:\n${instruction}\n\n` : ''
      }Markdown:\n${doc || '(empty)'}`
    case 'chat':
    default:
      return `${titleLine}User message:\n${instruction}\n\n${
        doc ? `Current markdown for context:\n${doc}` : 'No document content yet.'
      }`
  }
}

export function classifyGroqKeyError(message: string): 'retry' | 'disable' | 'fatal' {
  const m = message.toLowerCase()
  if (m.includes('invalid') && m.includes('api key')) return 'disable'
  if (m.includes('401') || m.includes('unauthorized')) return 'disable'
  if (
    m.includes('429') ||
    m.includes('rate limit') ||
    m.includes('quota') ||
    m.includes('insufficient') ||
    m.includes('capacity') ||
    m.includes('too many requests')
  ) {
    return 'retry'
  }
  return 'fatal'
}

export function stripModelMarkdownFences(text: string) {
  let out = text.trim()
  if (out.startsWith('```')) {
    out = out.replace(/^```(?:markdown|md)?\s*\n/i, '').replace(/\n```\s*$/, '')
  }
  return out.trim()
}

export async function validateGroqApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${GROQ_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) return { valid: true }
    const body = await res.json().catch(() => ({}))
    const message =
      (body as { error?: { message?: string } })?.error?.message || `Groq returned ${res.status}`
    return { valid: false, error: message }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Could not reach Groq' }
  }
}

function isGroqModelUnavailableError(message: string) {
  const m = message.toLowerCase()
  return m.includes('does not exist') || m.includes('decommissioned') || m.includes('not have access')
}

async function callGroqChat(
  apiKey: string,
  model: string,
  action: KimemAction,
  userMessage: string,
  wantsMarkdownOnly: boolean
) {
  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: wantsMarkdownOnly ? 0.4 : 0.6,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: wantsMarkdownOnly
            ? userMessage
            : action === 'analyze'
              ? `${userMessage}\n\nReply in clear plain text (short sections, bullet lists OK). Do not output a full rewritten document unless asked.`
              : userMessage,
        },
      ],
    }),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
    choices?: { message?: { content?: string } }[]
  }

  if (!res.ok) {
    const msg = data.error?.message || `Groq error (${res.status})`
    throw new Error(msg)
  }

  return data
}

export async function runKimemAi(options: {
  apiKey: string
  action: KimemAction
  instruction: string
  markdown: string
  title?: string
  model?: string
}): Promise<{ kind: 'markdown' | 'text'; content: string }> {
  const { apiKey, action, instruction, markdown, title, model } = options
  const userMessage = buildUserMessage(action, instruction, markdown, title)

  const wantsMarkdownOnly =
    action === 'create' ||
    action === 'edit' ||
    action === 'rephrase' ||
    action === 'restructure'

  const models = getGroqModelCandidates(model)
  let lastError: Error | null = null

  for (const candidate of models) {
    try {
      const data = await callGroqChat(apiKey, candidate, action, userMessage, wantsMarkdownOnly)
      const raw = data.choices?.[0]?.message?.content?.trim() || ''
      if (!raw) throw new Error('Empty response from Kimem AI')

      if (wantsMarkdownOnly) {
        return { kind: 'markdown', content: stripModelMarkdownFences(raw) }
      }
      return { kind: 'text', content: raw }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      lastError = error instanceof Error ? error : new Error(msg)
      if (isGroqModelUnavailableError(msg)) continue
      throw lastError
    }
  }

  throw lastError || new Error('No Groq model available. Set KIMEM_GROQ_MODEL on the server or update Admin keys.')
}

export async function runKimemAiWithKeyPool(
  pool: { id: string; apiKey: string }[],
  options: Omit<Parameters<typeof runKimemAi>[0], 'apiKey'>,
  hooks: {
    onSuccess: (id: string) => Promise<void>
    onFailure: (id: string, message: string, kind: 'retry' | 'disable' | 'fatal') => Promise<void>
  }
) {
  let lastError: Error | null = null

  for (const entry of pool) {
    if (!entry.apiKey.trim()) continue
    try {
      const result = await runKimemAi({ ...options, apiKey: entry.apiKey })
      await hooks.onSuccess(entry.id)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kimem AI request failed'
      lastError = error instanceof Error ? error : new Error(message)
      const kind = classifyGroqKeyError(message)
      await hooks.onFailure(entry.id, message, kind)
      if (kind === 'retry') continue
      if (kind === 'disable') continue
      throw lastError
    }
  }

  throw lastError || new Error('All platform Groq keys are unavailable. Add another key in Admin or try again later.')
}
