import { GetServerSideProps } from 'next'
import { supabase } from '../../lib/supabaseClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useTheme } from '../../lib/ThemeContext'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id as string
  const { data } = await supabase.from('files').select().eq('id', id).single()
  return { props: { content: data?.content || '' } }
}

export default function FilePage({ content }: { content: string }) {
  const { colors, theme, toggleTheme } = useTheme()
  
  return (
    <div style={{ 
      maxWidth: 800, 
      margin: '0 auto', 
      padding: 20,
      backgroundColor: colors.background,
      color: colors.text,
      minHeight: '100vh',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      {/* Header with theme toggle */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 30 
      }}>
        <h1 style={{ color: colors.text }}>Shared File</h1>
        <button
          onClick={toggleTheme}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: colors.buttonBackground,
            color: colors.buttonText,
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
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
              <h1 {...props} style={{ fontSize: '2em', marginTop: '1.5em', marginBottom: '0.5em', color: colors.text }} />
            ),
            h2: ({node, ...props}) => (
              <h2 {...props} style={{ fontSize: '1.5em', marginTop: '1.5em', marginBottom: '0.5em', color: colors.text }} />
            ),
            h3: ({node, ...props}) => (
              <h3 {...props} style={{ fontSize: '1.25em', marginTop: '1.5em', marginBottom: '0.5em', color: colors.text }} />
            ),
            code: ({node, ...props}: any) => {
              const isInline = !props.className?.includes('language-')
              return isInline ? 
                <code {...props} style={{ 
                  background: colors.codeBackground, 
                  padding: '2px 4px', 
                  borderRadius: '3px',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  color: colors.text
                }} /> :
                <pre style={{ 
                  background: colors.codeBackground, 
                  padding: '1em', 
                  borderRadius: '5px', 
                  overflowX: 'auto',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  color: colors.text
                }}>
                  <code {...props} />
                </pre>
            },
            blockquote: ({node, ...props}) => (
              <blockquote {...props} style={{ 
                borderLeft: `4px solid ${colors.blockquoteBorder}`, 
                paddingLeft: '1em', 
                margin: '1em 0', 
                color: colors.blockquoteText 
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
                border: `1px solid ${colors.tableBorder}`, 
                padding: '8px', 
                textAlign: 'left',
                backgroundColor: colors.tableHeader,
                color: colors.text
              }} />
            ),
            td: ({node, ...props}) => (
              <td {...props} style={{ 
                border: `1px solid ${colors.tableBorder}`, 
                padding: '8px', 
                textAlign: 'left',
                color: colors.text
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