import { GetServerSideProps } from 'next'
import { getFileById, getSocialStats } from '../../lib/dbSchema'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useTheme } from '../../lib/ThemeContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../../lib/auth-client'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
}

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
        fileId: id,
        content,
        title: fileData.title,
        author: fileData.author,
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
  fileId,
  content,
  title,
  author,
  fileType,
  createdAt
}: {
  fileId: string
  content: string
  title: string
  author?: string
  fileType: string
  createdAt: string
}) {
  const { colors, theme, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const router = useRouter()
  const { data: session } = useSession()

  // Social features state
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [userHasLiked, setUserHasLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentUrl(window.location.href)
    loadSocialData()
  }, [fileId])

  const loadSocialData = async () => {
    try {
      // Load like stats
      const likeRes = await fetch(`/api/likes?fileId=${fileId}`)
      if (likeRes.ok) {
        const likeData = await likeRes.json()
        setLikeCount(likeData.likeCount)
        setUserHasLiked(likeData.userHasLiked)
      }

      // Load comments
      const commentRes = await fetch(`/api/comments?fileId=${fileId}`)
      if (commentRes.ok) {
        const commentData = await commentRes.json()
        setComments(commentData.comments || [])
        setCommentCount(commentData.comments?.length || 0)
      }
    } catch (err) {
      console.error('Error loading social data:', err)
    }
  }

  const handleLike = async () => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setLikeCount(data.likeCount)
        setUserHasLiked(data.userHasLiked)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, content: newComment })
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setComments([data.comment, ...comments])
        setCommentCount(commentCount + 1)
        setNewComment('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to post comment')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId))
        setCommentCount(commentCount - 1)
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
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
        <div style={{ flex: 1 }}>
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '15px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = colors.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = colors.text
              e.currentTarget.style.borderColor = colors.border
            }}
          >
            ← Back
          </button>

          <h1 style={{ color: colors.text, marginBottom: '8px' }}>{title}</h1>
          <div style={{
            fontSize: '14px',
            color: colors.secondary,
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <span>Type: {fileType.toUpperCase()}</span>
            {author && <span>By: {author}</span>}
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

      {/* Social Stats and Actions */}
      <div style={{
        marginBottom: 30,
        padding: '20px',
        backgroundColor: colors.cardBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={handleLike}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: userHasLiked ? '#ff4444' : colors.buttonBackground,
              color: colors.buttonText,
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {userHasLiked ? '❤️' : '🤍'} {likeCount}
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '16px',
            color: colors.secondary
          }}>
            💬 {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
          </div>
        </div>
      </div>

      {/* Markdown Content */}
      <div
        style={{
          lineHeight: '1.6',
          fontSize: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          marginBottom: 40
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img: ({ node, ...props }) => (
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
            a: ({ node, ...props }) => (
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
            h1: ({ node, ...props }) => (
              <h1 {...props} style={{ fontSize: '2em', marginTop: '1.5em', marginBottom: '0.5em', color: colors.text }} />
            ),
            h2: ({ node, ...props }) => (
              <h2 {...props} style={{ fontSize: '1.5em', marginTop: '1.5em', marginBottom: '0.5em', color: colors.text }} />
            ),
            h3: ({ node, ...props }) => (
              <h3 {...props} style={{ fontSize: '1.25em', marginTop: '1.5em', marginBottom: '0.5em', color: colors.text }} />
            ),
            code: ({ node, ...props }: any) => {
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
            blockquote: ({ node, ...props }) => (
              <blockquote {...props} style={{
                borderLeft: `4px solid ${colors.blockquoteBorder}`,
                paddingLeft: '1em',
                margin: '1em 0',
                color: colors.blockquoteText
              }} />
            ),
            table: ({ node, ...props }) => (
              <table {...props} style={{
                borderCollapse: 'collapse',
                width: '100%',
                margin: '1em 0'
              }} />
            ),
            th: ({ node, ...props }) => (
              <th {...props} style={{
                border: `1px solid ${colors.tableBorder}`,
                padding: '8px',
                textAlign: 'left',
                backgroundColor: colors.tableHeader,
                color: colors.text
              }} />
            ),
            td: ({ node, ...props }) => (
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

      {/* Comments Section */}
      <div style={{
        marginTop: 40,
        padding: '20px',
        backgroundColor: colors.cardBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px'
      }}>
        <h2 style={{ marginBottom: 20, color: colors.text }}>Comments</h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} style={{ marginBottom: 30 }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... (Sign in required)"
            style={{
              width: '100%',
              minHeight: 100,
              padding: '12px',
              fontSize: '14px',
              backgroundColor: colors.background,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              resize: 'vertical',
              fontFamily: 'inherit',
              marginBottom: 10
            }}
            maxLength={1000}
          />
          {error && (
            <div style={{ color: '#ff4444', marginBottom: 10, fontSize: '14px' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: colors.primary,
              color: '#000000',
              border: 'none',
              borderRadius: '5px',
              cursor: isSubmitting || !newComment.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: isSubmitting || !newComment.trim() ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && newComment.trim()) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>

        {/* Comments List */}
        <div>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.secondary, padding: '20px' }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  padding: '15px',
                  marginBottom: '15px',
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '5px'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  color: colors.secondary,
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                  {/* Only show delete button if user is the comment owner */}
                  {session?.user?.id && session.user.id === comment.user_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: 'transparent',
                        color: '#ff4444',
                        border: `1px solid #ff4444`,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ff4444'
                        e.currentTarget.style.color = '#fff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#ff4444'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div style={{ color: colors.text, whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}