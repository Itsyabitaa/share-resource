import { jsPDF } from 'jspdf'

function plain(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\\\|/g, '|')
    .trim()
}

function cells(line: string) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => plain(cell))
}

export function downloadMarkdownPdf(title: string, markdown: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const width = pageWidth - margin * 2
  let y = margin

  const room = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const writeLines = (text: string, size: number, style: 'normal' | 'bold', gap: number, indent = 0) => {
    const value = plain(text)
    if (!value) return
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(value, width - indent) as string[]
    const lineHeight = size * 1.35
    lines.forEach(line => {
      room(lineHeight)
      doc.text(line, margin + indent, y)
      y += lineHeight
    })
    y += gap
  }

  const writeTable = (rows: string[][]) => {
    if (rows.length === 0) return
    const cols = Math.max(...rows.map(row => row.length))
    const colWidth = width / cols
    const size = 10
    const lineHeight = 14
    doc.setFontSize(size)
    rows.forEach((row, rowIndex) => {
      const wrapped = Array.from({ length: cols }, (_, index) =>
        doc.splitTextToSize(row[index] || '', colWidth - 10) as string[]
      )
      const rowHeight = Math.max(...wrapped.map(lines => lines.length)) * lineHeight + 10
      room(rowHeight)
      doc.setDrawColor(180)
      doc.setFillColor(rowIndex === 0 ? 236 : 255, rowIndex === 0 ? 253 : 255, rowIndex === 0 ? 245 : 255)
      wrapped.forEach((lines, index) => {
        const x = margin + index * colWidth
        doc.rect(x, y, colWidth, rowHeight, 'FD')
        doc.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal')
        doc.setTextColor(28, 25, 23)
        lines.forEach((line, lineIndex) => {
          doc.text(line, x + 5, y + 14 + lineIndex * lineHeight)
        })
      })
      y += rowHeight
    })
    y += 12
  }

  writeLines(title || 'Untitled nest', 20, 'bold', 16)

  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      y += 8
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      index += 1
      code.forEach(codeLine => writeLines(codeLine || ' ', 10, 'normal', 0, 8))
      y += 10
      continue
    }

    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes('|')) {
        const row = lines[index].trim()
        if (!/^\|?\s*:?-{3,}/.test(row)) rows.push(cells(row))
        index += 1
      }
      writeTable(rows)
      continue
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length || 1
      writeLines(trimmed.replace(/^#{1,3}\s+/, ''), level === 1 ? 16 : 13, 'bold', 8)
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const text = trimmed.replace(/^([-*]|\d+\.)\s+/, '')
      writeLines(`• ${text}`, 11, 'normal', 3, 8)
      index += 1
      continue
    }

    const paragraph: string[] = [trimmed]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^#{1,3}\s+/.test(lines[index].trim()) && !lines[index].includes('|')) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    writeLines(paragraph.join(' '), 11, 'normal', 8)
  }

  const safe = (title || 'document').replace(/[^\w\- ]+/g, '').trim() || 'document'
  doc.save(`${safe}.pdf`)
}
