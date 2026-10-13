import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function headingId(children: React.ReactNode) {
  return String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
          table: ({ children }) => (
            <div className="md-table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
