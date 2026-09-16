export function buildApiKeyDisplay(apiKey: string) {
  const trimmed = apiKey.trim()
  if (trimmed.length <= 12) return 'gsk_…'
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`
}
