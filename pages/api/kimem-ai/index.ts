import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { getUserPlan, incrementKimemTrialUses, incrementKimemUsesTotal } from '../../../lib/dbSchema'
import { resolveKimemAccess } from '../../../lib/resolveKimemApiKey'
import { runKimemAi, runKimemAiWithKeyPool, type KimemAction } from '../../../lib/kimemAi'
import {
  getPlatformGroqKeyPool,
  recordPlatformGroqKeyFailure,
  recordPlatformGroqKeySuccess,
} from '../../../lib/platformGroqKeys'
import { rateLimit, clientKey } from '../../../lib/rateLimit'

const ACTIONS: KimemAction[] = ['create', 'edit', 'rephrase', 'analyze', 'restructure', 'chat']

const MAX_MARKDOWN_CHARS = 120_000
const MAX_INSTRUCTION_CHARS = 8_000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limit = rateLimit(`kimem-ai:${clientKey(req)}`, 40, 15 * 60 * 1000)
  if (!limit.ok) {
    return res.status(429).json({ error: 'Too many Kimem AI requests. Try again later.' })
  }

  const session = await auth.api.getSession({ headers: req.headers as any })
  const userId = session?.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Sign in required.' })
  }

  const plan = await getUserPlan(userId)
  if (plan !== 'pro') {
    return res.status(403).json({ error: 'Kimem AI is available on Pro only. Upgrade to Pro to use it.' })
  }

  const access = await resolveKimemAccess(userId)
  if (!access.canUseKimem) {
    return res.status(403).json({
      error: access.blockedReason || 'Add your Groq API key in Settings to continue with Kimem AI.',
      code: 'kimem_trial_exhausted',
      trialUsed: access.trialUsed,
      trialMax: access.trialMax,
      hasOwnKey: access.hasOwnKey,
    })
  }

  const { action, instruction = '', markdown = '', title } = req.body as {
    action?: KimemAction
    instruction?: string
    markdown?: string
    title?: string
  }

  if (!action || !ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Invalid action.' })
  }

  const instr = String(instruction).slice(0, MAX_INSTRUCTION_CHARS)
  const md = String(markdown).slice(0, MAX_MARKDOWN_CHARS)

  const needsInstruction =
    action === 'edit' || action === 'chat' || action === 'create'
  if (needsInstruction && !instr.trim() && action !== 'create') {
    return res.status(400).json({ error: 'Describe what you want Kimem AI to do.' })
  }

  const needsMarkdown =
    action === 'edit' || action === 'rephrase' || action === 'restructure' || action === 'analyze'
  if (needsMarkdown && !md.trim()) {
    return res.status(400).json({ error: 'Add some markdown in the editor first.' })
  }

  try {
    const runOptions = {
      action,
      instruction: instr,
      markdown: md,
      title: title ? String(title).slice(0, 500) : undefined,
    }

    const result = access.usePlatformPool
      ? await runKimemAiWithKeyPool(await getPlatformGroqKeyPool(), runOptions, {
          onSuccess: recordPlatformGroqKeySuccess,
          onFailure: async (id, message, kind) => {
            await recordPlatformGroqKeyFailure(id, message, {
              disable: kind === 'disable',
              cooldownMs: kind === 'retry' ? 15 * 60 * 1000 : undefined,
            })
          },
        })
      : await runKimemAi({
          apiKey: access.apiKey!,
          ...runOptions,
        })

    let trialUsed = access.trialUsed
    if (access.source === 'platform') {
      trialUsed = await incrementKimemTrialUses(userId)
    }
    const totalRuns = await incrementKimemUsesTotal(userId)

    return res.status(200).json({
      action,
      kind: result.kind,
      content: result.content,
      keySource: access.source,
      trialUsed,
      trialMax: access.trialMax,
      trialRemaining: Math.max(0, access.trialMax - trialUsed),
      hasOwnKey: access.hasOwnKey,
      totalRuns,
    })
  } catch (error) {
    console.error('Kimem AI error:', error)
    const message = error instanceof Error ? error.message : 'Kimem AI request failed'
    return res.status(502).json({ error: message })
  }
}
