const DEFAULT_ALLOWED_DOMAINS = ['gmail.com', 'googlemail.com']

function allowedDomains() {
  const fromEnv = process.env.ALLOWED_EMAIL_DOMAINS?.trim()
  if (!fromEnv) return DEFAULT_ALLOWED_DOMAINS
  return fromEnv
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

export const GMAIL_ONLY_MESSAGE =
  'Only Gmail addresses (@gmail.com) are allowed for now. Use Google sign-in or a Gmail email.'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getEmailDomain(email: string) {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  if (at < 1) return null
  return normalized.slice(at + 1)
}

export function isAllowedEmailDomain(email: string) {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return allowedDomains().includes(domain)
}

/** Blocks disposable-style Gmail aliases like user+tag@gmail.com when enabled. */
export function isAllowedSignupEmail(email: string) {
  if (!isAllowedEmailDomain(email)) return false

  const blockPlus = process.env.BLOCK_GMAIL_PLUS_ALIASES !== 'false'
  if (blockPlus) {
    const local = normalizeEmail(email).split('@')[0] || ''
    if (local.includes('+')) return false
  }

  return true
}

export function getEmailPolicyError(email: string): string | null {
  if (!getEmailDomain(email)) {
    return 'Enter a valid email address.'
  }
  if (!isAllowedEmailDomain(email)) {
    return GMAIL_ONLY_MESSAGE
  }
  if (!isAllowedSignupEmail(email)) {
    return 'Gmail plus-address aliases (email+tag@gmail.com) are not allowed.'
  }
  return null
}
