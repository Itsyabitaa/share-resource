type Bucket = { timestamps: number[] }

const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now()
  const bucket = buckets.get(key) || { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter(time => now - time < windowMs)

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket)
    return { ok: false, remaining: 0 }
  }

  bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return { ok: true, remaining: limit - bucket.timestamps.length }
}

export function clientKey(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}
