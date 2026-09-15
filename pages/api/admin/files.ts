import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import {
  getViralPosts,
  listAdminFiles,
  type AdminFileSort,
  type AdminFileStatusFilter,
} from '../../../lib/moderationDb'

const statusFilters: AdminFileStatusFilter[] = [
  'all',
  'active',
  'warned',
  'removed',
  'public',
  'private',
  'guest',
]

const sortOptions: AdminFileSort[] = ['newest', 'oldest', 'viral', 'views', 'shares']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!isAdminAuthorized(req, session?.user?.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'all'
  const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : 'newest'
  const mode = typeof req.query.mode === 'string' ? req.query.mode : 'list'

  const status = statusFilters.includes(statusRaw as AdminFileStatusFilter)
    ? (statusRaw as AdminFileStatusFilter)
    : 'all'
  const sort = sortOptions.includes(sortRaw as AdminFileSort)
    ? (sortRaw as AdminFileSort)
    : 'newest'

  try {
    if (mode === 'viral') {
      const files = await getViralPosts(30)
      return res.status(200).json({ files })
    }

    const files = await listAdminFiles({ query, status, sort, limit: 50 })
    return res.status(200).json({ files })
  } catch (error) {
    console.error('Admin files error:', error)
    return res.status(500).json({ error: 'Failed to load files' })
  }
}
