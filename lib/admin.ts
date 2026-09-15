export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const admins = getAdminEmails()
  if (admins.length === 0) return false
  return admins.includes(email.trim().toLowerCase())
}

export function isAdminAuthorized(req: { headers: { authorization?: string | string[] } }, email?: string | null) {
  const secret = process.env.ADMIN_SECRET
  const authHeader = req.headers.authorization
  const bearer = typeof authHeader === 'string' ? authHeader : authHeader?.[0]

  if (secret && bearer === `Bearer ${secret}`) {
    return true
  }

  return isAdminEmail(email)
}
