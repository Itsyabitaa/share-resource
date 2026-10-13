import { GState, jsPDF } from 'jspdf'

type PdfDoc = jsPDF

const TEAL: [number, number, number] = [15, 118, 110]
const INK: [number, number, number] = [28, 25, 23]
const STONE: [number, number, number] = [120, 113, 108]

function pdfSafe(text: string) {
  return text
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
}

function plain(text: string) {
  return pdfSafe(text)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\\\|/g, '|')
    .trim()
}

function fileNumber(fileId: string) {
  const compact = fileId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return compact || 'MDNEST'
}

function wrapText(doc: PdfDoc, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  const chunksOf = (word: string) => {
    if (doc.getTextWidth(word) <= maxWidth) return [word]
    const chunks: string[] = []
    let buf = ''
    for (const char of word) {
      const next = buf + char
      if (buf && doc.getTextWidth(next) > maxWidth) {
        chunks.push(buf)
        buf = char
      } else {
        buf = next
      }
    }
    if (buf) chunks.push(buf)
    return chunks
  }

  words.forEach(word => {
    chunksOf(word).forEach(chunk => {
      const trial = current ? `${current} ${chunk}` : chunk
      if (doc.getTextWidth(trial) <= maxWidth) {
        current = trial
      } else {
        if (current) lines.push(current)
        current = chunk
      }
    })
  })
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function drawNest(doc: PdfDoc, x: number, y: number) {
  doc.setDrawColor(...TEAL)
  doc.setFillColor(...TEAL)
  doc.setLineWidth(1.15)
  doc.ellipse(x + 8, y, 9, 3.4, 'S')
  doc.ellipse(x + 8, y - 2.6, 6.4, 2.5, 'S')
  doc.ellipse(x + 8, y - 4.8, 3.8, 1.7, 'S')
  doc.circle(x + 5.6, y - 7, 1.15, 'F')
  doc.circle(x + 10.4, y - 7, 1.15, 'F')
}

export function downloadMarkdownPdf(options: { title: string; markdown: string; fileId: string }) {
  const title = plain(options.title) || 'Untitled nest'
  const number = fileNumber(options.fileId)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 56
  const top = 86
  const bottom = 58
  const contentWidth = pageWidth - marginX * 2
  let y = top

  const paintChrome = () => {
    const pages = doc.getNumberOfPages()
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page)
      doc.setFillColor(...TEAL)
      doc.rect(0, 0, pageWidth, 7, 'F')

      doc.saveGraphicsState()
      doc.setGState(new GState({ opacity: 0.055 }))
      doc.setTextColor(...TEAL)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      for (let row = -1; row < 16; row += 1) {
        for (let col = -1; col < 5; col += 1) {
          const markX = col * 150 + (row % 2) * 74
          const markY = 70 + row * 58
          doc.text('md-nest', markX, markY, { angle: 28 })
        }
      }
      doc.setGState(new GState({ opacity: 0.09 }))
      doc.setFontSize(54)
      doc.text('md-nest', pageWidth / 2, pageHeight / 2 + 8, { align: 'center', angle: 28 })
      doc.restoreGraphicsState()

      drawNest(doc, marginX, 40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...TEAL)
      doc.text('md-nest', marginX + 22, 40)

      const label = `FILE  ${number}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const badgeWidth = doc.getTextWidth(label) + 16
      const badgeX = pageWidth - marginX - badgeWidth
      doc.setFillColor(240, 253, 250)
      doc.setDrawColor(...TEAL)
      doc.setLineWidth(0.8)
      doc.roundedRect(badgeX, 26, badgeWidth, 16, 3, 3, 'FD')
      doc.setTextColor(...TEAL)
      doc.text(label, badgeX + 8, 37)

      doc.setDrawColor(220, 214, 206)
      doc.setLineWidth(0.6)
      doc.line(marginX, 54, pageWidth - marginX, 54)
      doc.line(marginX, pageHeight - 38, pageWidth - marginX, pageHeight - 38)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...STONE)
      doc.text('mdnest.vercel.app', marginX, pageHeight - 22)
      doc.text(`${page}  /  ${pages}`, pageWidth - marginX, pageHeight - 22, { align: 'right' })
    }
  }

  const newPage = () => {
    doc.addPage()
    y = top
  }

  const room = (height: number) => {
    if (y + height > pageHeight - bottom) newPage()
  }

  const write = (
    text: string,
    size: number,
    style: 'normal' | 'bold' | 'italic',
    gap: number,
    indent = 0,
    color: [number, number, number] = INK
  ) => {
    const value = plain(text)
    if (!value) return null
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lineHeight = size * 1.45
    let firstY = -1
    let firstPage = doc.getNumberOfPages()
    wrapText(doc, value, contentWidth - indent).forEach(line => {
      room(lineHeight)
      if (firstY < 0) {
        firstY = y
        firstPage = doc.getNumberOfPages()
      }
      doc.text(line, marginX + indent, y)
      y += lineHeight
    })
    y += gap
    return { y: firstY, page: firstPage }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  wrapText(doc, title, contentWidth).forEach(line => {
    room(28)
    doc.text(line, marginX, y)
    y += 28
  })
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(2)
  doc.line(marginX, y - 6, marginX + 42, y - 6)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEAL)
  doc.text(`File number  ${number}`, marginX, y)
  y += 22

  const source = options.markdown.replace(/\r\n/g, '\n').split('\n')
  const firstHeading = source.find(line => /^#\s+/.test(line.trim()))
  const skipDuplicateTitle = firstHeading
    ? plain(firstHeading.replace(/^#\s+/, '')).toLowerCase() === title.toLowerCase()
    : false

  let index = 0
  let skippedTitle = false
  while (index < source.length) {
    const raw = source[index]
    const trimmed = raw.trim()

    if (!trimmed) {
      y += 6
      index += 1
      continue
    }

    if (!skippedTitle && skipDuplicateTitle && /^#\s+/.test(trimmed)) {
      skippedTitle = true
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < source.length && !source[index].trim().startsWith('```')) {
        code.push(pdfSafe(source[index]))
        index += 1
      }
      index += 1
      const startY = y
      const startPage = doc.getNumberOfPages()
      code.forEach(codeLine => write(codeLine || ' ', 9, 'normal', 1, 12, [41, 37, 36]))
      if (doc.getNumberOfPages() === startPage) {
        doc.setFillColor(245, 243, 239)
        doc.rect(marginX, startY - 12, contentWidth, y - startY + 8, 'F')
        const saved = y
        y = startY
        doc.setPage(startPage)
        code.forEach(codeLine => write(codeLine || ' ', 9, 'normal', 1, 12, [41, 37, 36]))
        y = saved
      }
      y += 8
      continue
    }

    if (trimmed.startsWith('>')) {
      const quote: string[] = []
      while (index < source.length && source[index].trim().startsWith('>')) {
        quote.push(source[index].trim().replace(/^>\s?/, ''))
        index += 1
      }
      const startPage = doc.getNumberOfPages()
      const startY = y
      const placed = write(quote.join(' '), 11, 'italic', 10, 16, [68, 64, 60])
      if (placed && placed.page === startPage && doc.getNumberOfPages() === startPage) {
        doc.setDrawColor(...TEAL)
        doc.setLineWidth(2.5)
        doc.line(marginX + 2, startY - 11, marginX + 2, y - 12)
        doc.setLineWidth(0.6)
      }
      continue
    }

    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      const rows: string[][] = []
      while (index < source.length && source[index].includes('|')) {
        const row = source[index].trim()
        if (!/^\|?\s*:?-{3,}/.test(row)) {
          rows.push(row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => plain(cell)))
        }
        index += 1
      }
      const cols = Math.max(1, ...rows.map(row => row.length))
      const colWidth = contentWidth / cols
      rows.forEach((row, rowIndex) => {
        doc.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal')
        doc.setFontSize(9)
        const wrapped = Array.from({ length: cols }, (_, col) => wrapText(doc, row[col] || '', colWidth - 12))
        const rowHeight = Math.max(...wrapped.map(lines => lines.length), 1) * 12 + 10
        room(rowHeight)
        doc.setDrawColor(210, 204, 196)
        doc.setFillColor(rowIndex === 0 ? 236 : 255, rowIndex === 0 ? 248 : 255, rowIndex === 0 ? 245 : 255)
        wrapped.forEach((lines, col) => {
          const x = marginX + col * colWidth
          doc.rect(x, y, colWidth, rowHeight, 'FD')
          doc.setTextColor(...INK)
          lines.forEach((line, lineIndex) => {
            doc.text(line, x + 6, y + 14 + lineIndex * 12)
          })
        })
        y += rowHeight
      })
      y += 12
      continue
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length || 1
      const size = level === 1 ? 16 : level === 2 ? 13 : 11.5
      y += level === 2 ? 8 : 4
      const placed = write(trimmed.replace(/^#{1,6}\s+/, ''), size, 'bold', 4)
      if (placed && level === 2) {
        doc.setDrawColor(204, 232, 228)
        doc.setLineWidth(0.8)
        doc.line(marginX, y - 2, marginX + contentWidth, y - 2)
        y += 6
      }
      index += 1
      continue
    }

    const list = raw.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/)
    if (list) {
      const depth = Math.min(4, Math.floor(list[1].length / 2))
      const indent = 18 + depth * 14
      const placed = write(list[2], 11, 'normal', 3, indent)
      if (placed && placed.y > 0) {
        const current = doc.getNumberOfPages()
        doc.setPage(placed.page)
        doc.setFillColor(...TEAL)
        doc.circle(marginX + indent - 10, placed.y - 3, 1.7, 'F')
        doc.setPage(current)
      }
      index += 1
      continue
    }

    const paragraph = [trimmed]
    index += 1
    while (
      index < source.length &&
      source[index].trim() &&
      !/^#{1,6}\s+/.test(source[index].trim()) &&
      !source[index].trim().startsWith('>') &&
      !source[index].trim().startsWith('```') &&
      !(source[index].includes('|') && source[index].split('|').length > 2) &&
      !/^(\s*)(?:[-*+]|\d+\.)\s+/.test(source[index])
    ) {
      paragraph.push(source[index].trim())
      index += 1
    }
    write(paragraph.join(' '), 11, 'normal', 8)
  }

  paintChrome()
  const safe = title.replace(/[^\w\- ]+/g, '').trim() || 'document'
  doc.save(`${safe}.pdf`)
}
