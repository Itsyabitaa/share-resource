import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function headingId(children: React.ReactNode) {
  return String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function MarkdownDocument({ markdown }: { markdown: string }) {
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
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
