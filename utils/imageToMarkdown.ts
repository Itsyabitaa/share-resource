import { apiFetch } from '../lib/apiFetch'
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
  const safeName = file.name?.trim() || 'photo.jpg'
  formData.append('file', file, safeName)

  const res = await apiFetch(apiPath('/upload-image'), {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not upload photo.')
  }

  return data.url as string
}

type OcrResult = {
  text: string
  confidence: number
}

export async function recognizeImageText(
  file: File,
  onProgress?: (message: string) => void
): Promise<OcrResult> {
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
    return {
      text: (data.text || '').trim(),
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    }
  } finally {
    await worker.terminate()
  }
}

/** OCR on photos is often wrong; avoid turning noise into fake headings/tables. */
function isLikelyUsefulOcr(text: string, confidence: number): boolean {
  const trimmed = text.trim()
  if (!trimmed || confidence < 42) return false

  const compact = trimmed.replace(/\s/g, '')
  if (compact.length < 40) return false

  const letters = (compact.match(/[a-zA-Z]/g) || []).length
  const digits = (compact.match(/[0-9]/g) || []).length
  const usefulChars = letters + digits
  if (usefulChars / compact.length < 0.5) return false

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 8) return false

  const shortWords = words.filter((word) => word.length <= 2).length
  if (shortWords / words.length > 0.45) return false

  return true
}

function buildPhotoMarkdown(options: {
  title: string
  alt: string
  imageUrl: string
  ocrText?: string
}) {
  const { title, alt, imageUrl, ocrText } = options
  const lines = [
    `# ${title}`,
    '',
    `![${alt}](${imageUrl})`,
    '',
  ]

  if (ocrText) {
    lines.push(
      '## Extracted text',
      '',
      '_Automatic scan — please review and edit. Your photo stays above._',
      '',
      '```text',
      ocrText,
      '```',
      '',
    )
  } else {
    lines.push(
      '_Your photo is saved above. We could not read the text clearly from this shot — add notes below or retake with even lighting and a flat angle._',
      '',
    )
  }

  lines.push('## Notes', '', '')
  return lines.join('\n')
}

function shouldRunOcrOnDevice() {
  if (typeof navigator === 'undefined') return true
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export async function convertImageToMarkdown(
  file: File,
  autoFormat: boolean,
  apiPath: (path: string) => string,
  onProgress?: (message: string) => void
) {
  const title = titleFromFilename(file.name || 'photo.jpg')
  const alt = title

  onProgress?.('Uploading photo…')
  const imageUrl = await uploadPhotoForMarkdown(file, apiPath)

  let ocrText = ''
  try {
    if (!shouldRunOcrOnDevice()) {
      onProgress?.('Photo saved — add notes in the editor.')
    } else {
    const ocr = await recognizeImageText(file, onProgress)
    if (isLikelyUsefulOcr(ocr.text, ocr.confidence)) {
      ocrText = autoFormat
        ? formatToMarkdown(ocr.text, {
            detectHeadings: false,
            detectTables: false,
            detectCodeBlocks: false,
            reflowParagraphs: true,
          })
        : ocr.text
    }
    }
  } catch (error) {
    console.warn('Photo OCR failed:', error)
  }

  return {
    title,
    content: buildPhotoMarkdown({
      title,
      alt,
      imageUrl,
      ocrText: ocrText || undefined,
    }),
  }
}
