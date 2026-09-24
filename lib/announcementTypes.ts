export type AnnouncementDisplay = 'banner' | 'popup' | 'both'
export type AnnouncementColor = 'teal' | 'amber' | 'rose' | 'ink'
export type AnnouncementPlacement = 'top' | 'bottom'
export type AnnouncementAudience = 'all' | 'guests' | 'signed_in' | 'free' | 'pro'

export type SiteAnnouncement = {
  id: string
  title: string
  message: string
  enabled: boolean
  display: AnnouncementDisplay
  color: AnnouncementColor
  placement: AnnouncementPlacement
  audience: AnnouncementAudience
  ctaLabel: string | null
  ctaUrl: string | null
  guideSteps: string[]
}

export const ANNOUNCEMENT_COLORS: AnnouncementColor[] = ['teal', 'amber', 'rose', 'ink']
export const ANNOUNCEMENT_AUDIENCES: { id: AnnouncementAudience; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'guests', label: 'Guests only' },
  { id: 'signed_in', label: 'Signed-in users' },
  { id: 'free', label: 'Free accounts' },
  { id: 'pro', label: 'Pro accounts' },
]
