import mammoth from 'mammoth'
import { formatToMarkdown, isAlreadyMarkdown } from '../utils/markdownFormatter'

type FileKind = 'pdf' | 'docx' | 'doc' | 'rtf' | 'md' | 'txt' | 'unknown'

type MammothMarkdown = {
  convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>
}

export class ConvertError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ConvertError'
    this.status = status
  }
}

function extensionOf(filename: string) {
  const match = filename.toLowerCase().match(/\.[^.]+$/)
  return match ? match[0] : ''
}

export function detectKind(buffer: Buffer, filename: string): FileKind {
  const ext = extensionOf(filename)
  const ascii = buffer.subarray(0, 16).toString('latin1')

  if (buffer.length >= 5 && ascii.startsWith('%PDF')) return 'pdf'
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) return 'docx'
  if (buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf) return 'doc'
  if (ascii.trimStart().startsWith('{\\rtf')) return 'rtf'

  if (ext === '.pdf') return 'pdf'
  if (ext === '.docx') return 'docx'
  if (ext === '.doc') return 'doc'
  if (ext === '.rtf') return 'rtf'
  if (ext === '.md' || ext === '.markdown') return 'md'
  if (ext === '.txt') return 'txt'
  return 'unknown'
}

function looksLikeBinaryDump(text: string) {
  if (!text) return false
  if (text.startsWith('PK')) return true
  if (text.includes('\u0000')) return true
  const sample = text.slice(0, 400)
  const replacement = (sample.match(/\uFFFD/g) || []).length
  return replacement > 12
}

function titleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, '') || 'uploaded-file'
}

async function docxToMarkdown(buffer: Buffer) {
  const convert = (mammoth as unknown as MammothMarkdown).convertToMarkdown
  const result = await convert({ buffer })
  return (result.value || '').trim()
}

async function wordToText(buffer: Buffer) {
  const imported: any = await import('word-extractor')
  const WordExtractor = imported.default || imported
  const extractor = new WordExtractor()
  const doc = await extractor.extract(buffer)
  const parts = [doc.getHeaders?.(), doc.getBody?.(), doc.getFootnotes?.()]
  return parts.filter(Boolean).join('\n\n').trim()
}

async function pdfToText(buffer: Buffer) {
  const { extractText } = await import('unpdf')
  const result = await extractText(new Uint8Array(buffer), { mergePages: true })
  const text = result.text
  return (typeof text === 'string' ? text : String(text ?? '')).trim()
}

function rtfToText(rtf: string) {
  return rtf
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\line/gi, '\n')
    .replace(/\\tab/gi, '\t')
    .replace(/\{\\*\\[^{}]+\}/g, '')
    .replace(/\\'[0-9a-fA-F]{2}/g, (match) => {
      return String.fromCharCode(parseInt(match.slice(2), 16))
    })
    .replace(/\\[a-z]+\-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function convertBufferToMarkdown(
  buffer: Buffer,
  filename: string,
  autoFormat: boolean
) {
  const kind = detectKind(buffer, filename)
  const title = titleFromFilename(filename)
  let content = ''

  switch (kind) {
    case 'pdf': {
      try {
        content = await pdfToText(buffer)
      } catch {
        throw new ConvertError('Could not read this PDF. It may be password-protected or damaged.')
      }
      if (!content) {
        throw new ConvertError('This PDF has no extractable text. It may be a scan or image-only file.')
      }
      if (autoFormat) content = formatToMarkdown(content)
      break
    }
    case 'docx': {
      try {
        content = await docxToMarkdown(buffer)
      } catch {
        content = await wordToText(buffer)
      }
      if (!content) {
        throw new ConvertError('Could not read this Word document. Try saving it as .docx.')
      }
      if (autoFormat && !isAlreadyMarkdown(content)) {
        content = formatToMarkdown(content)
      }
      break
    }
    case 'doc': {
      try {
        content = await wordToText(buffer)
      } catch {
        try {
          content = await docxToMarkdown(buffer)
        } catch {
          throw new ConvertError('Could not read this Word document. Try saving it as .docx.')
        }
      }
      if (!content) {
        throw new ConvertError('Could not read this Word document. Try saving it as .docx.')
      }
      if (autoFormat && !isAlreadyMarkdown(content)) {
        content = formatToMarkdown(content)
      }
      break
    }
    case 'rtf': {
      content = rtfToText(buffer.toString('latin1'))
      if (!content) {
        throw new ConvertError('Could not read this RTF document.')
      }
      if (autoFormat) content = formatToMarkdown(content)
      break
    }
    case 'md': {
      content = buffer.toString('utf-8')
      if (autoFormat && !isAlreadyMarkdown(content)) {
        content = formatToMarkdown(content)
      }
      break
    }
    case 'txt': {
      content = buffer.toString('utf-8')
      if (autoFormat) content = formatToMarkdown(content)
      break
    }
    default:
      throw new ConvertError('Unsupported file type. Use TXT, MD, DOC, DOCX, or PDF.')
  }

  if (looksLikeBinaryDump(content)) {
    throw new ConvertError('Could not convert this file. Try exporting it as .docx, .md, or .pdf.')
  }

  return { content, title }
}
