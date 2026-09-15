export type Heading = { id: string; text: string; level: number }

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  const seen = new Map<string, number>()

  markdown.split('\n').forEach(line => {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (!match) return

    const text = match[2].replace(/[#*`]/g, '').trim()
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    const id = count ? `${base}-${count}` : base

    headings.push({ id, text, level: match[1].length })
  })

  return headings
}
