import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function headingId(children: React.ReactNode) {
  return String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function tableEdges(el: HTMLDivElement) {
  const max = el.scrollWidth - el.clientWidth
  const wide = max > 1
  return {
    wide,
    left: wide && el.scrollLeft > 2,
    right: wide && el.scrollLeft < max - 2,
  }
}

function WideTable({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const [edges, setEdges] = useState({ wide: false, left: false, right: false })
  const [track, setTrack] = useState(0)

  useEffect(() => {
    const el = scrollerRef.current
    const dock = dockRef.current
    if (!el || !dock) return

    const applyEdges = () => {
      setEdges(tableEdges(el))
      setTrack(current => current === el.scrollWidth ? current : el.scrollWidth)
    }
    const fromTable = () => {
      if (syncing.current) return
      syncing.current = true
      dock.scrollLeft = el.scrollLeft
      syncing.current = false
      applyEdges()
    }
    const fromDock = () => {
      if (syncing.current) return
      syncing.current = true
      el.scrollLeft = dock.scrollLeft
      syncing.current = false
      applyEdges()
    }

    applyEdges()
    el.addEventListener('scroll', fromTable, { passive: true })
    dock.addEventListener('scroll', fromDock, { passive: true })
    const observer = new ResizeObserver(applyEdges)
    observer.observe(el)
    const table = el.querySelector('table')
    if (table) observer.observe(table)
    return () => {
      el.removeEventListener('scroll', fromTable)
      dock.removeEventListener('scroll', fromDock)
      observer.disconnect()
    }
  }, [children])

  const nudge = (direction: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(160, Math.round(el.clientWidth * 0.72)), behavior: 'smooth' })
  }

  const frameClass = [
    'md-table-frame',
    edges.wide ? 'is-wide' : '',
    edges.left ? 'can-left' : '',
    edges.right ? 'can-right' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={frameClass}>
      {edges.wide && (
        <div className="md-table-bar">
          <span>Wide table</span>
          <div className="md-table-nudge">
            <button type="button" aria-label="Scroll table left" disabled={!edges.left} onClick={() => nudge(-1)}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.2 3.2 5.4 8l4.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" aria-label="Scroll table right" disabled={!edges.right} onClick={() => nudge(1)}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.8 3.2 10.6 8l-4.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      )}
      <div className="md-table-viewport">
        <div
          className="md-table-scroll"
          ref={scrollerRef}
          tabIndex={edges.wide ? 0 : undefined}
          aria-label={edges.wide ? 'Wide table, scroll horizontally' : undefined}
        >
          <table>{children}</table>
        </div>
      </div>
      <div className="md-table-dock" ref={dockRef} hidden={!edges.wide} aria-hidden="true">
        <div style={{ width: track }} />
      </div>
    </div>
  )
}

export default function MarkdownDocument({ markdown, omitMatchingTitle }: { markdown: string; omitMatchingTitle?: string }) {
  const source = omitMatchingTitle
    ? markdown.replace(/^\uFEFF?\s*#\s+([^\n]+)\n?/, (full, text) => {
        const plain = String(text).replace(/[#*`]/g, '').trim().toLowerCase()
        return plain === omitMatchingTitle.trim().toLowerCase() ? '' : full
      })
    : markdown

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children, ...props }) => <h1 id={headingId(children)} {...props}>{children}</h1>,
          h2: ({ children, ...props }) => <h2 id={headingId(children)} {...props}>{children}</h2>,
          h3: ({ children, ...props }) => <h3 id={headingId(children)} {...props}>{children}</h3>,
          table: ({ children }) => <WideTable>{children}</WideTable>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
