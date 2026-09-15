import type { ParsedUrlQuery } from 'querystring'

const CODE_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'An account with this email already exists. Try signing in instead.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists. Try signing in instead.',
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
  INVALID_PASSWORD: 'Password does not meet requirements.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before signing in.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
}

const SOCIAL_URL_ERROR_MESSAGES: Record<string, string> = {
  google: 'Google sign-in was cancelled or failed. Please try again.',
  oauth: 'Social sign-in was cancelled or failed. Please try again.',
  social: 'Social sign-in was cancelled or failed. Please try again.',
  access_denied: 'Google sign-in was cancelled.',
  unable_to_create_user:
    'We could not create your account with Google. If you already have an account, sign in with email instead.',
  account_not_found: 'No account found for that Google email. Try signing up first.',
  email_already_in_use:
    'That email is already registered. Sign in with email or use a different Google account.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  state_mismatch: 'Sign-in session expired. Please try Google sign-in again.',
  invalid_code: 'Google sign-in failed. Please try again.',
}

const GENERIC_SOCIAL_ERROR_CODES = new Set(['google', 'github', 'oauth', 'social'])

function collectQueryValues(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectQueryValues(item))
  }
  return []
}

function humanizeErrorCode(code: string): string {
  return code.replace(/_/g, ' ').replace(/-/g, ' ')
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item)
      if (found) return found
    }
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = firstString(nested)
      if (found) return found
    }
  }
  return undefined
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback
  if (typeof error === 'string') return error.trim() || fallback

  if (error instanceof Error) {
    return error.message.trim() || fallback
  }

  if (typeof error !== 'object') return fallback

  const record = error as Record<string, unknown>

  const fromMessage = firstString(record.message)
  if (fromMessage) return fromMessage

  if (typeof record.code === 'string') {
    const mapped = CODE_MESSAGES[record.code]
    if (mapped) return mapped
  }

  const fromStatus = firstString(record.statusText)
  if (fromStatus) return fromStatus

  if (typeof record.code === 'string') {
    return record.code.replace(/_/g, ' ').toLowerCase()
  }

  return fallback
}

export function getSocialLoginUrlErrorMessage(query: ParsedUrlQuery): string | null {
  const description = collectQueryValues(query.error_description)[0]
  if (description) return description

  const codes = collectQueryValues(query.error).map((code) => code.toLowerCase())
  if (codes.length === 0) return null

  const specificCodes = codes.filter((code) => !GENERIC_SOCIAL_ERROR_CODES.has(code))
  const code = specificCodes[specificCodes.length - 1] || codes[codes.length - 1]

  if (SOCIAL_URL_ERROR_MESSAGES[code]) {
    return SOCIAL_URL_ERROR_MESSAGES[code]
  }

  const mapped = CODE_MESSAGES[code.toUpperCase().replace(/-/g, '_')]
  if (mapped) return mapped

  return `Sign-in failed (${humanizeErrorCode(code)}). Please try again.`
}
