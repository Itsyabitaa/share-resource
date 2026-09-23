import { getUserPlan, insertFile } from './dbSchema'
import { getCloudinaryConfig } from './userCredentials'
import { uploadMarkdown } from './cloudinaryOps'
import { computeFileStorage } from './storagePolicy'

export function publicSiteOrigin() {
  const configured = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL
  return (configured || 'https://mdnest.vercel.app').replace(/\/$/, '')
}

export function titleFromMarkdown(content: string, explicit?: string) {
  const given = explicit?.trim()
  if (given) return given.slice(0, 200)
  const heading = content.match(/^#{1,3}\s+(.+)$/m)
  if (heading?.[1]) return heading[1].trim().slice(0, 200)
  const line = content.split('\n').map((part) => part.trim()).find(Boolean)
  if (line) return line.replace(/^#+\s*/, '').slice(0, 200)
  return 'Shared from Claude'
}

export async function shareMarkdown(options: {
  userId: string
  content: string
  title?: string
  author?: string
  isPublic?: boolean
}) {
  const content = options.content.trim()
  if (!content) {
    throw new Error('Content is required')
  }

  const isPublic = options.isPublic !== false
  const title = titleFromMarkdown(content, options.title)
  const userPlan = await getUserPlan(options.userId)
  const { storageTier, expiresAt, message } = computeFileStorage(userPlan)
  const config = await getCloudinaryConfig(options.userId)
  const uploadResult = await uploadMarkdown(content, config)
  const fileData = await insertFile(
    title,
    uploadResult.secure_url,
    'txt',
    content.length,
    options.author,
    isPublic,
    [],
    options.userId,
    expiresAt || undefined,
    storageTier
  )

  return {
    id: fileData.id as string,
    title: fileData.title as string,
    url: `${publicSiteOrigin()}/file/${fileData.id}`,
    isPublic: !!fileData.is_public,
    expiresAt: fileData.expires_at,
    storageTier: fileData.storage_tier,
    message,
  }
}
