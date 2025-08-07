import { GetServerSideProps } from 'next'
import { getFileById } from '../../lib/dbSchema'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useTheme } from '../../lib/ThemeContext'
import { useState, useEffect } from 'react'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id as string
  
  try {
    const fileData = await getFileById(id)
    
    if (!fileData) {
      return {
        notFound: true
      }
    }

    // Fetch content from Cloudinary URL
    const response = await fetch(fileData.cloudinary_url)
    const content = await response.text()

    return { 
      props: { 
        content,
        title: fileData.title,
        fileType: fileData.file_type,
        createdAt: fileData.created_at
      } 
    }
  } catch (error) {
    console.error('Error fetching file:', error)
    return {
      notFound: true
    }
  }
}

export default function FilePage({ 
  content, 
  title, 
  fileType, 
  createdAt 
}: { 
  content: string
  title: string
  fileType: string
  createdAt: string
}) {
  const { colors, theme, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    setCurrentUrl(window.location.href)
  }, [])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = currentUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
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
      {/* Header with theme toggle and copy link */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 30 
      }}>
        <div>
          <h1 style={{ color: colors.text, marginBottom: '8px' }}>{title}</h1>
          <div style={{ 
            fontSize: '14px', 
            color: colors.secondary,
            display: 'flex',
            gap: '20px'
          }}>
            <span>Type: {fileType.toUpperCase()}</span>
            <span>Created: {new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: copied ? '#28a745' : colors.buttonBackground,
              color: colors.buttonText,
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
          >
            {copied ? '✅' : '📋'} {copied ? 'Copied!' : 'Copy Link'}
          </button>
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
      </div>
      
      {/* Shareable URL Display */}
      <div style={{ 
        marginBottom: 20,
        padding: '15px',
        backgroundColor: colors.cardBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <div style={{ 
          color: colors.secondary, 
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          Share this link:
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          wordBreak: 'break-all'
        }}>
          <code style={{ 
            flex: 1,
            padding: '8px 12px',
            backgroundColor: colors.codeBackground,
            borderRadius: '4px',
            fontSize: '13px',
            color: colors.text,
            border: `1px solid ${colors.border}`
          }}>
            {currentUrl}
          </code>
        </div>
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