/**
 * Converts plain / messy text (paste, PDF, Word, TXT) into clean markdown.
 * Existing markdown is preserved and lightly normalized.
 */

interface FormatterOptions {
    detectHeadings?: boolean
    detectLists?: boolean
    detectCodeBlocks?: boolean
    detectLinks?: boolean
  detectQuotes?: boolean
  detectTables?: boolean
  reflowParagraphs?: boolean
    preserveWhitespace?: boolean
}

const DEFAULT_OPTIONS: FormatterOptions = {
    detectHeadings: true,
    detectLists: true,
    detectCodeBlocks: true,
    detectLinks: true,
  detectQuotes: true,
  detectTables: true,
  reflowParagraphs: true,
    preserveWhitespace: false,
}

const BULLET_CHARS = '•●○◦▪▫■□◆◇►▸‣·∙–—'
const CODE_START =
  /^(function|const|let|var|class|def|public|private|protected|import|export|package|using|fn|pub|async|await|return|try|catch|throw|module|interface|type|enum)\b/
const CODE_SIGNAL =
  /[{};=<>]|=>|::|->|\/\/|\/\*|\*\/|#include|#define|console\.|System\.out|printf\(|print\(|self\.|this\./
const URL_RE = /https?:\/\/[^\s<>\[\]()]+/g
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const MD_HEADING = /^#{1,6}\s/
const MD_BULLET = /^[-*+]\s+/
const MD_ORDERED = /^\d+\.\s+/
const MD_QUOTE = /^>\s?/
const MD_FENCE = /^```/
const MD_HR = /^(-{3,}|\*{3,}|_{3,})$/
const MD_TABLE_SEP = /^\|?[\s:]*-{3,}[\s:]*(\|[\s:]*-{3,}[\s:]*)+\|?$/

export function formatToMarkdown(text: string, options: FormatterOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options }
  if (!text || !text.trim()) return text

  let content = cleanArtifacts(text)
  let lines = content.split('\n')

  if (opts.reflowParagraphs) {
    lines = reflowSoftWrappedLines(lines)
  }

  lines = formatStructure(lines, opts)
  lines = formatInlineAcrossLines(lines, opts)

  if (!opts.preserveWhitespace) {
    lines = normalizeWhitespace(lines)
  }

  return lines.join('\n').trim()
}

export function quickFormat(text: string): string {
  return formatToMarkdown(text)
}

export function isAlreadyMarkdown(text: string): boolean {
  if (!text?.trim()) return false

  const lines = text.split('\n')
  let score = 0

  for (const line of lines) {
    const t = line.trim()
    if (MD_HEADING.test(t)) score += 2
    if (MD_BULLET.test(t) || MD_ORDERED.test(t)) score += 1
    if (MD_FENCE.test(t)) score += 2
    if (MD_QUOTE.test(t)) score += 1
    if (/\[[^\]]+\]\([^)]+\)/.test(t)) score += 1
    if (MD_TABLE_SEP.test(t)) score += 2
    if (score >= 4) return true
  }

  return score >= 3
}

function cleanArtifacts(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\u00ad/g, '') // soft hyphen
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '') // zero-width
    .replace(/\u00a0/g, ' ') // nbsp
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
}

/**
 * PDF/Word often break sentences across lines. Join soft wraps;
 * keep blank lines, lists, headings, and code-looking lines separate.
 */
function reflowSoftWrappedLines(lines: string[]): string[] {
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    let line = lines[i]
        const trimmed = line.trim()

    if (!trimmed) {
      out.push('')
      i++
      continue
    }

    if (shouldKeepStandalone(trimmed) || isLikelyCodeLine(trimmed)) {
      out.push(line)
      i++
            continue
        }

    while (i + 1 < lines.length) {
      const next = lines[i + 1]
      const nextTrim = next.trim()
      if (!nextTrim) break
      if (shouldKeepStandalone(nextTrim) || isLikelyCodeLine(nextTrim)) break
      if (!isSoftWrapCandidate(trimmed, nextTrim)) break

      const joiner = /[-–—]$/.test(trimmed) ? '' : ' '
      line = `${trimmed.replace(/[-–—]$/, '')}${joiner}${nextTrim}`
      i++
    }

    out.push(line)
    i++
  }

  return out
}

function shouldKeepStandalone(trimmed: string): boolean {
  return (
    MD_HEADING.test(trimmed) ||
    MD_BULLET.test(trimmed) ||
    MD_ORDERED.test(trimmed) ||
    MD_QUOTE.test(trimmed) ||
    MD_FENCE.test(trimmed) ||
    MD_HR.test(trimmed) ||
    /^[=_-]{3,}$/.test(trimmed) ||
    isBulletLine(trimmed) ||
    isOrderedLine(trimmed) ||
    isHeadingCandidate(trimmed) ||
    isQuoteCandidate(trimmed) ||
    looksLikeTableRow(trimmed) ||
    MD_TABLE_SEP.test(trimmed)
  )
}

function isSoftWrapCandidate(current: string, next: string): boolean {
  if (/^[=_-]{3,}$/.test(next) || MD_HR.test(next)) return false
  if (/^[=_-]{3,}$/.test(current)) return false

  // Don't join if current already ends a sentence and next looks like a new sentence/title
  const endsSentence = /[.!?]"?$/.test(current)
  const nextStartsLower = /^[a-z]/.test(next)
  const nextStartsUpper = /^[A-Z]/.test(next)

  if (endsSentence && nextStartsUpper && !nextStartsLower) return false
  if (current.length > 120 && endsSentence) return false
  if (next.length > 100 && nextStartsUpper && endsSentence) return false

  // Join when next continues mid-sentence, or current has no terminal punctuation
  if (nextStartsLower) return true
  if (!/[.!?]$/.test(current) && current.length < 100) return true
  if (/[,:;]$/.test(current)) return true
  if (/[-–—]$/.test(current)) return true

  return false
}

function formatStructure(lines: string[], opts: FormatterOptions): string[] {
  const out: string[] = []
  let i = 0
  let foundTitle = false
  let inFence = false

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (MD_FENCE.test(trimmed)) {
      inFence = !inFence
      out.push(line)
      i++
            continue
        }

    if (inFence) {
      out.push(line)
      i++
            continue
        }

    if (!trimmed) {
      out.push('')
      i++
            continue
        }

    // Already markdown — keep as-is (light normalize bullets)
    if (MD_HEADING.test(trimmed) || MD_QUOTE.test(trimmed) || MD_HR.test(trimmed)) {
      out.push(trimmed)
      if (MD_HEADING.test(trimmed)) foundTitle = true
      i++
            continue
        }

    if (MD_BULLET.test(trimmed)) {
      const indent = leadingIndent(line)
      out.push(`${indent}- ${trimmed.replace(MD_BULLET, '')}`)
      i++
            continue
        }

    if (MD_ORDERED.test(trimmed)) {
      out.push(trimmed)
      i++
      continue
    }

    // Setext headings: Title\n=====
    if (opts.detectHeadings && i + 1 < lines.length) {
      const next = lines[i + 1]?.trim() || ''
      if (/^={3,}$/.test(next) || /^-{3,}$/.test(next)) {
        const level = !foundTitle ? 1 : next.startsWith('=') ? 1 : 2
        out.push(`${'#'.repeat(level)} ${trimmed}`)
        foundTitle = true
        i += 2
        continue
      }
    }

    // Horizontal rule plain text
    if (/^[-*_=\.]{3,}$/.test(trimmed) && trimmed.length <= 80) {
      out.push('---')
      i++
            continue
        }

    // Tables
    if (opts.detectTables && looksLikeTableRow(trimmed)) {
      const table = collectTable(lines, i)
      if (table.rows.length >= 2) {
        out.push(...toMarkdownTable(table.rows))
        i = table.nextIndex
        continue
      }
    }

    // Code blocks — only when consecutive strong signals
    if (opts.detectCodeBlocks && isLikelyCodeLine(trimmed)) {
      const block = collectCodeBlock(lines, i)
      if (block.lines.length >= 2 || isStrongCodeLine(trimmed)) {
        const lang = guessLanguage(block.lines)
        out.push(`\`\`\`${lang}`)
        out.push(...block.lines.map(dedentCodeLine))
        out.push('```')
        i = block.nextIndex
        continue
      }
    }

    // Quotes
    if (opts.detectQuotes && isQuoteCandidate(trimmed)) {
      out.push(`> ${trimmed.replace(/^["“]|["”]$/g, '').replace(/^>\s?/, '')}`)
      i++
            continue
        }

    // Bullets
    if (opts.detectLists && isBulletLine(trimmed)) {
      const indent = leadingIndent(line)
      out.push(`${indent}- ${extractBulletText(trimmed)}`)
      i++
            continue
        }

    // Ordered lists — preserve numbering
    if (opts.detectLists && isOrderedLine(trimmed)) {
      const indent = leadingIndent(line)
      const parsed = parseOrdered(trimmed)
      if (parsed) {
        out.push(`${indent}${parsed.n}. ${parsed.text}`)
        i++
            continue
      }
    }

    // Headings
    if (opts.detectHeadings) {
      const heading = classifyHeading(trimmed, foundTitle, i === firstContentIndex(lines))
      if (heading) {
        out.push(`${'#'.repeat(heading.level)} ${heading.text}`)
        foundTitle = true
        i++
        continue
      }
    }

    out.push(line)
    i++
  }

  return out
}

function firstContentIndex(lines: string[]): number {
  return lines.findIndex(l => l.trim().length > 0)
}

function classifyHeading(
  trimmed: string,
  foundTitle: boolean,
  isFirstContent: boolean
): { level: number; text: string } | null {
  // ALL CAPS title (one strong word, or multi-word)
  if (
    trimmed.length >= 4 &&
    trimmed.length <= 80 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    /^[A-Z0-9][A-Z0-9\s\-–—:&/]+$/.test(trimmed) &&
    !/[.!?]$/.test(trimmed)
  ) {
    const words = trimmed.split(/\s+/).length
    if (words >= 2 || trimmed.length >= 5) {
      const text = words >= 2 ? toTitleCase(trimmed) : trimmed.charAt(0) + trimmed.slice(1).toLowerCase()
      return { level: foundTitle || !isFirstContent ? 2 : 1, text }
    }
  }

  // "Section Title:" short label
  if (/^[A-Z][^:]{1,50}:$/.test(trimmed) && !/[.!?]$/.test(trimmed.slice(0, -1))) {
    return { level: 3, text: trimmed.slice(0, -1).trim() }
  }

  // Numbered section: "1. Introduction" as heading when short and title-like
  // (handled as list if longer body text — skip here)

  // First line as H1 title
  if (
    isFirstContent &&
    !foundTitle &&
    trimmed.length >= 3 &&
    trimmed.length <= 90 &&
    !/[.!?]$/.test(trimmed) &&
    !isBulletLine(trimmed) &&
    !isOrderedLine(trimmed) &&
    !URL_RE.test(trimmed)
  ) {
    return { level: 1, text: trimmed }
  }

  // Short Title Case line surrounded intent — treat as H2 when clearly a heading shape
  if (
    foundTitle &&
    isHeadingCandidate(trimmed) &&
    /^[A-Z]/.test(trimmed) &&
    trimmed.length <= 70 &&
    !/[.!?]$/.test(trimmed) &&
    trimmed.split(/\s+/).length <= 10
  ) {
    // Only promote if it looks like Title Case (majority capitalized words)
    const words = trimmed.split(/\s+/).filter(w => /[A-Za-z]/.test(w))
    const caps = words.filter(w => /^[A-Z]/.test(w)).length
    if (words.length >= 2 && caps / words.length >= 0.7) {
      return { level: 2, text: trimmed }
    }
  }

  return null
}

function isHeadingCandidate(trimmed: string): boolean {
  if (MD_HEADING.test(trimmed)) return true
  if (trimmed.length < 3 || trimmed.length > 90) return false
  if (/[.!?]$/.test(trimmed)) return false
  if (isBulletLine(trimmed) || isOrderedLine(trimmed)) return false
  if (/^[=_-]{3,}$/.test(trimmed)) return false
  if (
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    (trimmed.split(/\s+/).length >= 2 || trimmed.length >= 5)
  ) {
    return true
  }
  if (/^[A-Z][^:]{1,50}:$/.test(trimmed)) return true
  return false
}

function isBulletLine(trimmed: string): boolean {
  if (MD_BULLET.test(trimmed)) return true
  const re = new RegExp(`^[${escapeRegExp(BULLET_CHARS)}]\\s+.+`)
  if (re.test(trimmed)) return true
  // "o item" or "*item" without space (common PDF)
  if (/^[o*]\s+\S/.test(trimmed)) return true
  return false
}

function extractBulletText(trimmed: string): string {
  return trimmed
    .replace(new RegExp(`^[${escapeRegExp(BULLET_CHARS)}]\\s*`), '')
    .replace(/^[o*]\s+/, '')
    .replace(MD_BULLET, '')
    .trim()
}

function isOrderedLine(trimmed: string): boolean {
  if (MD_ORDERED.test(trimmed)) return true
  // 1) 1. (1) a) a. (a) — but not "i.e." or version numbers alone
  if (/^\d+[.)]\s+\S/.test(trimmed)) return true
  if (/^\(\d+\)\s+\S/.test(trimmed)) return true
  if (/^[a-z][.)]\s+\S/i.test(trimmed) && !/^(i\.e\.|e\.g\.|vs\.|etc\.)/i.test(trimmed)) {
    return true
  }
  return false
}

function parseOrdered(trimmed: string): { n: number; text: string } | null {
  let m = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
  if (m) return { n: parseInt(m[1], 10), text: m[2] }

  m = trimmed.match(/^\((\d+)\)\s+(.+)$/)
  if (m) return { n: parseInt(m[1], 10), text: m[2] }

  m = trimmed.match(/^([a-z])[.)]\s+(.+)$/i)
  if (m) {
    const letter = m[1].toLowerCase()
    return { n: letter.charCodeAt(0) - 96, text: m[2] }
  }

  return null
}

function isQuoteCandidate(trimmed: string): boolean {
  if (MD_QUOTE.test(trimmed)) return true
  if (/^["“].{8,}["”]$/.test(trimmed)) return true
  return false
}

function isLikelyCodeLine(trimmed: string): boolean {
  if (!trimmed) return false
  if (shouldSkipCodeHeuristic(trimmed)) return false
  if (CODE_START.test(trimmed)) return true
  if (isStrongCodeLine(trimmed)) return true
  // Indented line with code signals
  return false
}

function isStrongCodeLine(trimmed: string): boolean {
  if (shouldSkipCodeHeuristic(trimmed)) return false
  if (CODE_START.test(trimmed) && CODE_SIGNAL.test(trimmed)) return true
  if (/[{};]\s*$/.test(trimmed) && CODE_SIGNAL.test(trimmed)) return true
  if (/^(<\/?[a-zA-Z][^>]*>)/.test(trimmed)) return true
  if (/^\$\s+\S/.test(trimmed)) return true // shell
  if (/^(npm|yarn|pnpm|git|curl|wget|cd|ls|mkdir)\s/.test(trimmed)) return true
  return false
}

function shouldSkipCodeHeuristic(trimmed: string): boolean {
  return (
    MD_HEADING.test(trimmed) ||
    MD_BULLET.test(trimmed) ||
    MD_ORDERED.test(trimmed) ||
    isBulletLine(trimmed) ||
    isOrderedLine(trimmed) ||
    isHeadingCandidate(trimmed)
  )
}

function collectCodeBlock(
  lines: string[],
  start: number
): { lines: string[]; nextIndex: number } {
  const block: string[] = []
  let i = start

  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) {
      // allow one blank inside code? stop on blank for safety
      break
    }
    if (!(isLikelyCodeLine(t) || isStrongCodeLine(t) || /^[\s]*[{}\])]/.test(lines[i]))) {
      break
    }
    block.push(lines[i])
    i++
  }

  return { lines: block, nextIndex: i }
}

function dedentCodeLine(line: string): string {
  return line.replace(/^\t/, '  ').replace(/^ {4}/, '')
}

function guessLanguage(codeLines: string[]): string {
  const blob = codeLines.join('\n')
  if (/\bdef\s+\w+\s*\(|\bimport\s+\w+|print\(/.test(blob)) return 'python'
  if (/\bfunction\b|\bconst\b|\blet\b|=>|console\./.test(blob)) return 'javascript'
  if (/\binterface\b|\btype\s+\w+\s*=|\bexport\s+(default|type)/.test(blob)) return 'typescript'
  if (/<\/?[a-zA-Z]/.test(blob)) return 'html'
  if (/\{[\s\S]*:[^;]+;/.test(blob) && !/function|const|let/.test(blob)) return 'css'
  if (/^\s*\$/m.test(blob) || /\b(npm|git|curl)\s/.test(blob)) return 'bash'
  if (/\bpublic\s+class\b|\bSystem\.out/.test(blob)) return 'java'
  if (/\bfn\s+\w+|let\s+mut\b/.test(blob)) return 'rust'
  if (/\bpackage\s+main\b|\bfunc\s+\w+\(/.test(blob)) return 'go'
  return ''
}

function looksLikeTableRow(trimmed: string): boolean {
  if (trimmed.includes('|') && trimmed.split('|').length >= 3) return true
  // tab-separated with 2+ columns
  if (trimmed.includes('\t') && trimmed.split('\t').length >= 2) return true
  return false
}

function collectTable(
  lines: string[],
  start: number
): { rows: string[][]; nextIndex: number } {
  const rows: string[][] = []
  let i = start
  let mode: 'pipe' | 'tab' | null = null

  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) break

    if (MD_TABLE_SEP.test(t)) {
      i++
            continue
        }

    let cells: string[] | null = null
    if (t.includes('|') && t.split('|').filter(c => c.trim()).length >= 2) {
      cells = t
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim())
      if (mode && mode !== 'pipe') break
      mode = 'pipe'
    } else if (t.includes('\t')) {
      cells = t.split('\t').map(c => c.trim())
      if (cells.length < 2) break
      if (mode && mode !== 'tab') break
      mode = 'tab'
    } else {
      break
    }

    if (!cells || cells.every(c => !c)) break
    rows.push(cells)
    i++
  }

  return { rows, nextIndex: i }
}

function toMarkdownTable(rows: string[][]): string[] {
  const width = Math.max(...rows.map(r => r.length))
  const norm = rows.map(r => {
    const copy = [...r]
    while (copy.length < width) copy.push('')
    return copy
  })

  const header = norm[0]
  const body = norm.slice(1)
  const sep = header.map(() => '---')

  return [
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...body.map(r => `| ${r.join(' | ')} |`),
  ]
}

function formatInlineAcrossLines(lines: string[], opts: FormatterOptions): string[] {
  let inFence = false

  return lines.map(line => {
    const trimmed = line.trim()
    if (MD_FENCE.test(trimmed)) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    if (trimmed.startsWith('```')) return line

    let result = line

    if (opts.detectLinks) {
      result = linkify(result)
    }

    result = applyInlineEmphasis(result)
    return result
  })
}

function linkify(line: string): string {
  // Skip lines that already have markdown links covering URLs
  if (/\[[^\]]*\]\(\s*https?:\/\//.test(line)) {
    // still link bare emails / remaining urls carefully
  }

  let out = ''
  let i = 0
  const chars = line

  while (i < chars.length) {
    // already inside markdown link
    if (chars[i] === '[' && chars.indexOf('](', i) > i) {
      const end = chars.indexOf(')', chars.indexOf('](', i))
      if (end > i) {
        out += chars.slice(i, end + 1)
        i = end + 1
        continue
      }
    }

    // inside inline code
    if (chars[i] === '`') {
      const end = chars.indexOf('`', i + 1)
      if (end > i) {
        out += chars.slice(i, end + 1)
        i = end + 1
        continue
      }
    }

    const slice = chars.slice(i)
    URL_RE.lastIndex = 0
    EMAIL_RE.lastIndex = 0
    const urlMatch = slice.match(/^https?:\/\/[^\s<>\[\]()]+/)
    const emailMatch = slice.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)

    if (urlMatch) {
      let url = urlMatch[0]
      const trailing = url.match(/[.,;:!?)]+$/)
      let trail = ''
      if (trailing) {
        trail = trailing[0]
        url = url.slice(0, -trail.length)
      }
      // Don't double-wrap
      if (out.endsWith('](') || out.endsWith('(')) {
        out += url + trail
      } else {
        out += `[${url}](${url})${trail}`
      }
      i += urlMatch[0].length
      continue
    }

    if (emailMatch && !out.endsWith('](')) {
      const email = emailMatch[0]
      out += `[${email}](mailto:${email})`
      i += email.length
      continue
    }

    out += chars[i]
    i++
  }

  return out
}

function applyInlineEmphasis(line: string): string {
  if (MD_HEADING.test(line.trim()) || MD_FENCE.test(line.trim())) return line

  // Normalize Word-style bold/italic markers that aren't valid markdown yet:
  // **bold**, __bold__, *italic* already fine. Convert <b>…</b> / <i>…</i> leftovers.
  return line
    .replace(/<\/?b>/gi, '**')
    .replace(/<\/?strong>/gi, '**')
    .replace(/<\/?i>/gi, '*')
    .replace(/<\/?em>/gi, '*')
}

function normalizeWhitespace(lines: string[]): string[] {
  const out: string[] = []
  let prevEmpty = false
  let prevWasHeading = false
  let prevWasList = false

    for (const line of lines) {
        const trimmed = line.trim()
    const empty = !trimmed

    if (empty) {
      if (!prevEmpty) out.push('')
      prevEmpty = true
      prevWasList = false
      continue
    }

    const isHeading = MD_HEADING.test(trimmed)
    const isList = MD_BULLET.test(trimmed) || MD_ORDERED.test(trimmed)

    // Blank line before headings (except at start)
    if (isHeading && out.length > 0 && out[out.length - 1] !== '') {
      out.push('')
    }

    // Blank line after headings
    if (prevWasHeading && !isHeading && out[out.length - 1] !== '') {
      // heading already pushed; ensure separation for paragraphs
    }

    // Blank line when leaving a list into a paragraph
    if (prevWasList && !isList && !isHeading && out.length > 0 && out[out.length - 1] !== '') {
      out.push('')
    }

    out.push(line.replace(/[ \t]+$/g, ''))
    prevEmpty = false
    prevWasHeading = isHeading
    prevWasList = isList

    if (isHeading) {
      out.push('')
      prevEmpty = true
    }
  }

  while (out.length && !out[0].trim()) out.shift()
  while (out.length && !out[out.length - 1].trim()) out.pop()

  // Collapse accidental triple blanks
  const collapsed: string[] = []
  let emptyRun = 0
  for (const line of out) {
    if (!line.trim()) {
      emptyRun++
      if (emptyRun <= 1) collapsed.push('')
    } else {
      emptyRun = 0
      collapsed.push(line)
    }
  }

  return collapsed
}

function leadingIndent(line: string): string {
  const spaces = line.match(/^[ \t]*/)?.[0] || ''
  // Cap indent for markdown lists (2-space levels)
  if (spaces.includes('\t')) return '  '
  if (spaces.length >= 4) return '  '
  if (spaces.length >= 2) return '  '
  return ''
}

function toTitleCase(text: string): string {
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'in', 'on', 'at', 'to', 'of', 'vs'])
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && small.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
