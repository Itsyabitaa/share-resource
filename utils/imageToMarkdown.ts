import { formatToMarkdown } from './markdownFormatter'

export function isImageFile(file: File) {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name)
}

function titleFromFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '') || 'photo'
  return base.replace(/[-_]+/g, ' ').trim() || 'photo'
}

export async function uploadPhotoForMarkdown(
  file: File,
  apiPath: (path: string) => string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(apiPath('/upload-image'), {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not upload photo.')
  }

  return data.url as string
}

export async function recognizeImageText(
  file: File,
  onProgress?: (message: string) => void
): Promise<string> {
  onProgress?.('Loading text recognition…')

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', undefined, {
    logger: (event) => {
      if (event.status === 'recognizing text' && typeof event.progress === 'number') {
        onProgress?.(`Reading photo… ${Math.round(event.progress * 100)}%`)
      }
    },
  })

  try {
    const { data } = await worker.recognize(file)
    return (data.text || '').trim()
  } finally {
    await worker.terminate()
  }
}

export async function convertImageToMarkdown(
  file: File,
  autoFormat: boolean,
  apiPath: (path: string) => string,
  onProgress?: (message: string) => void
) {
  const title = titleFromFilename(file.name)
  const alt = title

  let imageUrl: string | null = null
  try {
    onProgress?.('Uploading photo…')
    imageUrl = await uploadPhotoForMarkdown(file, apiPath)
  } catch (error) {
    console.warn('Photo upload failed:', error)
  }

  let ocrText = ''
  try {
    ocrText = await recognizeImageText(file, onProgress)
    if (autoFormat && ocrText) {
      ocrText = formatToMarkdown(ocrText)
    }
  } catch (error) {
    console.warn('Photo OCR failed:', error)
  }

  const imageMarkdown = imageUrl ? `![${alt}](${imageUrl})` : ''

  if (ocrText && imageMarkdown) {
    return {
      title,
      content: `${ocrText}\n\n---\n\n${imageMarkdown}`,
    }
  }

  if (ocrText) {
    return { title, content: ocrText }
  }

  if (imageMarkdown) {
    return {
      title,
      content: `# ${title}\n\n${imageMarkdown}\n\n_Add notes about this photo below._`,
    }
  }

  throw new Error('Could not read or upload this photo. Try again with better lighting.')
}
