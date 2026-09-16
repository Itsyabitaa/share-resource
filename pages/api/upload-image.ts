import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { auth } from '../../lib/auth'
import { uploadImageFile } from '../../lib/cloudinaryOps'
import { getCloudinaryConfig } from '../../lib/userCredentials'
import { getUserPlan } from '../../lib/dbSchema'
import { rateLimit, clientKey } from '../../lib/rateLimit'

export const config = {
  api: {
    bodyParser: false,
  },
}

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
])

function firstUploadedFile(files: Record<string, unknown>) {
  const raw = files.file as { filepath?: string } | { filepath?: string }[] | undefined
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limit = rateLimit(`upload-image:${clientKey(req)}`, 30, 15 * 60 * 1000)
  if (!limit.ok) {
    return res.status(429).json({ error: 'Too many uploads. Try again later.' })
  }

  let filePath = ''

  try {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    })

    const [, files] = await new Promise<[unknown, Record<string, unknown>]>((resolve, reject) => {
      form.parse(req, (err, _fields, parsedFiles) => {
        if (err) reject(err)
        else resolve([_fields, parsedFiles as Record<string, unknown>])
      })
    })

    const file = firstUploadedFile(files)
    if (!file?.filepath) {
      return res.status(400).json({ error: 'No image uploaded' })
    }

    filePath = file.filepath
    const mime = (file as { mimetype?: string }).mimetype || ''
    if (mime && !IMAGE_MIME.has(mime)) {
      return res.status(400).json({ error: 'Unsupported image type. Use JPG, PNG, or WEBP.' })
    }

    const session = await auth.api.getSession({
      headers: req.headers as any,
    })

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Sign in required for photo conversion.' })
    }

    const plan = await getUserPlan(session.user.id)
    if (plan !== 'pro') {
      return res.status(403).json({ error: 'Photo and camera to markdown is a Pro feature.' })
    }

    const config = await getCloudinaryConfig(session.user.id)
    const uploaded = await uploadImageFile(filePath, config)

    return res.status(200).json({ url: uploaded.secure_url })
  } catch (error) {
    console.error('Image upload error:', error)
    return res.status(500).json({ error: 'Image upload failed' })
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => undefined)
    }
  }
}
