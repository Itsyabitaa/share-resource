const CODE_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'An account with this email already exists. Try signing in instead.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists. Try signing in instead.',
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
  INVALID_PASSWORD: 'Password does not meet requirements.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before signing in.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
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
