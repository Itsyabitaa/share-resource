import type { NextApiRequest, NextApiResponse } from 'next'
import { readBearerToken, userIdForIntegrationToken } from '../../lib/integrationTokens'
import { shareMarkdown } from '../../lib/shareMarkdown'
import { clientKey, rateLimit } from '../../lib/rateLimit'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

const SHARE_TOOL = {
  name: 'share_to_mdnest',
  description:
    'Publish markdown on md-nest and return a link the other person can open. Links are public by default. Set is_public to false only when the user explicitly wants a private copy they alone can open.',
  inputSchema: {
    type: 'object',
    properties: {
      markdown: { type: 'string', description: 'Markdown to publish' },
      title: { type: 'string', description: 'Optional title. Defaults to the first heading.' },
      is_public: {
        type: 'boolean',
        description: 'Defaults to true. False means only the token owner can open the nest.',
      },
    },
    required: ['markdown'],
  },
}

type Rpc = {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: { name?: string; arguments?: Record<string, unknown> }
}

function rpcResult(id: Rpc['id'], result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function rpcError(id: Rpc['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Use POST for MCP JSON-RPC' })
  }
  if (req.method !== 'POST') return res.status(405).end()

  const body = req.body as Rpc
  if (!body || body.jsonrpc !== '2.0' || !body.method) {
    return res.status(400).json(rpcError(body?.id ?? null, -32600, 'Invalid JSON-RPC request'))
  }

  if (body.id == null) {
    return res.status(202).end()
  }

  if (body.method === 'initialize') {
    return res.status(200).json(rpcResult(body.id, {
      protocolVersion: '2025-03-26',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'md-nest', version: '1.0.0' },
    }))
  }

  if (body.method === 'tools/list') {
    return res.status(200).json(rpcResult(body.id, { tools: [SHARE_TOOL] }))
  }

  if (body.method === 'ping') {
    return res.status(200).json(rpcResult(body.id, {}))
  }

  if (body.method !== 'tools/call') {
    return res.status(200).json(rpcError(body.id, -32601, `Method not found: ${body.method}`))
  }

  const token = readBearerToken(req.headers.authorization)
  const userId = token ? await userIdForIntegrationToken(token) : null
  if (!userId) {
    return res.status(200).json(rpcResult(body.id, {
      content: [{ type: 'text', text: 'md-nest token missing or revoked. Add Authorization: Bearer mdnest_… on the connector.' }],
      isError: true,
    }))
  }

  if (body.params?.name !== 'share_to_mdnest') {
    return res.status(200).json(rpcResult(body.id, {
      content: [{ type: 'text', text: `Unknown tool: ${body.params?.name || ''}` }],
      isError: true,
    }))
  }

  const limit = rateLimit(`mcp-share:${userId}:${clientKey(req)}`, 40, 15 * 60 * 1000)
  if (!limit.ok) {
    return res.status(200).json(rpcResult(body.id, {
      content: [{ type: 'text', text: 'Too many shares. Try again later.' }],
      isError: true,
    }))
  }

  const args = body.params.arguments || {}
  const markdown = typeof args.markdown === 'string' ? args.markdown : ''
  const title = typeof args.title === 'string' ? args.title : undefined
  const isPublic = args.is_public !== false

  try {
    const shared = await shareMarkdown({ userId, content: markdown, title, isPublic })
    const visibility = shared.isPublic
      ? 'Anyone with this link can read it.'
      : 'This nest is private. Only you can open it.'
    return res.status(200).json(rpcResult(body.id, {
      content: [{
        type: 'text',
        text: `${shared.url}\n${visibility}`,
      }],
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Share failed'
    return res.status(200).json(rpcResult(body.id, {
      content: [{ type: 'text', text: message }],
      isError: true,
    }))
  }
}
