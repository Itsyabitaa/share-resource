import { v2 as cloudinary } from 'cloudinary'

export interface CloudinaryConfig {
  cloud_name: string
  api_key: string
  api_secret: string
}

let queue: Promise<unknown> = Promise.resolve()

function withCloudinary<T>(config: CloudinaryConfig, fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
    })
    return fn()
  })

  queue = run.then(() => undefined, () => undefined)
  return run
}

export function extractPublicId(url: string): string | null {
  const match = url.match(/\/md-nest\/([^/.]+)/)
  if (!match) return null
  return `md-nest/${match[1]}`
}

export async function uploadMarkdown(
  content: string,
  config: CloudinaryConfig,
  publicId = `md-nest/${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
) {
  return withCloudinary(config, () =>
    cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(content).toString('base64')}`,
      {
        resource_type: 'raw',
        public_id: publicId,
        format: 'txt',
        overwrite: true,
      }
    )
  )
}

export async function destroyRaw(publicId: string, config: CloudinaryConfig) {
  return withCloudinary(config, () =>
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
  )
}

export async function pingCloudinary(config: CloudinaryConfig) {
  return withCloudinary(config, () => cloudinary.api.ping())
}
