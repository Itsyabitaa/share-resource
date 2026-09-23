import type { NextApiRequest, NextApiResponse } from 'next'
import { oauthMetadata } from '../../../lib/mcpOauth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json(oauthMetadata().protectedResource)
}
