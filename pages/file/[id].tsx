import { GetServerSideProps } from 'next'
import { supabase } from '../../lib/supabaseClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id as string
  const { data } = await supabase.from('files').select().eq('id', id).single()
  return { props: { content: data?.content || '' } }
}

export default function FilePage({ content }: { content: string }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>Shared File</h1>
      <div 
        style={{ 
          lineHeight: '1.6',
          fontSize: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img: ({node, ...props}) => (
              <img 
                {...props} 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  display: 'block', 
                  margin: '1em auto' 
                }} 
              />
            ),
            a: ({node, ...props}) => (
              <a 
                {...props} 
                style={{ 
                  color: '#0070f3', 
                  textDecoration: 'none' 
                }}
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
            h1: ({node, ...props}) => (
              <h1 {...props} style={{ fontSize: '2em', marginTop: '1.5em', marginBottom: '0.5em', color: '#333' }} />
            ),
            h2: ({node, ...props}) => (
              <h2 {...props} style={{ fontSize: '1.5em', marginTop: '1.5em', marginBottom: '0.5em', color: '#333' }} />
            ),
            h3: ({node, ...props}) => (
              <h3 {...props} style={{ fontSize: '1.25em', marginTop: '1.5em', marginBottom: '0.5em', color: '#333' }} />
            ),
            code: ({node, inline, ...props}) => (
              inline ? 
                <code {...props} style={{ 
                  background: '#f1f1f1', 
                  padding: '2px 4px', 
                  borderRadius: '3px',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
                }} /> :
                <pre style={{ 
                  background: '#f1f1f1', 
                  padding: '1em', 
                  borderRadius: '5px', 
                  overflowX: 'auto',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
                }}>
                  <code {...props} />
                </pre>
            ),
            blockquote: ({node, ...props}) => (
              <blockquote {...props} style={{ 
                borderLeft: '4px solid #0070f3', 
                paddingLeft: '1em', 
                margin: '1em 0', 
                color: '#666' 
              }} />
            ),
            table: ({node, ...props}) => (
              <table {...props} style={{ 
                borderCollapse: 'collapse', 
                width: '100%', 
                margin: '1em 0' 
              }} />
            ),
            th: ({node, ...props}) => (
              <th {...props} style={{ 
                border: '1px solid #ddd', 
                padding: '8px', 
                textAlign: 'left',
                backgroundColor: '#f8f9fa'
              }} />
            ),
            td: ({node, ...props}) => (
              <td {...props} style={{ 
                border: '1px solid #ddd', 
                padding: '8px', 
                textAlign: 'left' 
              }} />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}