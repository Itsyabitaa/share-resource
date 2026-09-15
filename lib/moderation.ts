export type ModerationStatus = 'active' | 'warned' | 'removed'

export type ModerationAction = 'remove' | 'private' | 'warn' | 'restore'

export const COMMUNITY_TAKEDOWN_MESSAGE =
  'This post was taken down for violating community guidelines.'

export const DEFAULT_WARNING_MESSAGE =
  'Your content received a warning for violating community guidelines. Please review our rules before posting again.'

export function isModerationActive(status?: string | null) {
  return !status || status === 'active' || status === 'warned'
}

export function isFileRemoved(status?: string | null) {
  return status === 'removed'
}
