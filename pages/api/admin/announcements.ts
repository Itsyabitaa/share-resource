import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import {
  deleteAnnouncement,
  listAnnouncements,
  saveAnnouncement,
  setAnnouncementEnabled,
} from '../../../lib/announcements'
import type {
  AnnouncementAudience,
  AnnouncementColor,
  AnnouncementDisplay,
  AnnouncementPlacement,
} from '../../../lib/announcementTypes'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({ headers: req.headers as any })
  if (!isAdminAuthorized(req, session?.user?.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ announcements: await listAnnouncements(false) })
    }

    if (req.method === 'PATCH') {
      const id = typeof req.body?.id === 'string' ? req.body.id : ''
      if (!id) return res.status(400).json({ error: 'id is required' })
      const announcement = await setAnnouncementEnabled(id, req.body?.enabled === true)
      return res.status(200).json({ announcement })
    }

    if (req.method === 'DELETE') {
      const id = typeof req.body?.id === 'string' ? req.body.id : ''
      if (!id) return res.status(400).json({ error: 'id is required' })
      const removed = await deleteAnnouncement(id)
      if (!removed) return res.status(404).json({ error: 'Announcement not found' })
      return res.status(200).json({ success: true })
    }

    if (req.method === 'POST') {
      const announcement = await saveAnnouncement({
        id: typeof req.body?.id === 'string' ? req.body.id : undefined,
        title: String(req.body?.title || ''),
        message: String(req.body?.message || ''),
        enabled: req.body?.enabled !== false,
        display: req.body?.display as AnnouncementDisplay,
        color: req.body?.color as AnnouncementColor,
        placement: req.body?.placement as AnnouncementPlacement,
        audience: req.body?.audience as AnnouncementAudience,
        ctaLabel: typeof req.body?.ctaLabel === 'string' ? req.body.ctaLabel : '',
        ctaUrl: typeof req.body?.ctaUrl === 'string' ? req.body.ctaUrl : '',
        guideSteps: typeof req.body?.guideSteps === 'string' ? req.body.guideSteps : '',
      })
      return res.status(200).json({ announcement })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Announcement failed'
    return res.status(400).json({ error: message })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
