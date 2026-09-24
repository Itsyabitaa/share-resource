import type { NextApiRequest, NextApiResponse } from 'next'
import { listAnnouncements } from '../../lib/announcements'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const announcements = await listAnnouncements(true)
    return res.status(200).json({ announcements })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Could not load announcements' })
  }
}
