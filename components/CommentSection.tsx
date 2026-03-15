import { useState, useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { useRouter } from 'next/router'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
}

interface CommentSectionProps {
  fileId: string
  isAuthenticated: boolean
  currentUserId?: string
}

export default function CommentSection({ fileId, isAuthenticated, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { colors } = useTheme()
  const router = useRouter()

  useEffect(() => {
    loadComments()
  }, [fileId])

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/comments?fileId=${fileId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(router.asPath))
      return
    }

    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, content: newComment.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setComments([data.comment, ...comments])
        setNewComment('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{
        marginBottom: '20px',
        fontSize: '1.3rem',
        color: colors.text
      }}>
        💬 Comments ({comments.length})
      </h3>

      {/* Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            maxLength={1000}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              backgroundColor: colors.inputBackground,
              color: colors.text,
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '10px'
          }}>
            <span style={{
              fontSize: '12px',
              color: colors.secondary
            }}>
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              style={{
                padding: '8px 20px',
                backgroundColor: newComment.trim() ? colors.buttonBackground : colors.border,
                color: newComment.trim() ? colors.buttonText : colors.secondary,
                border: 'none',
                borderRadius: '6px',
                cursor: newComment.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '20px',
          backgroundColor: colors.inputBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <p style={{ color: colors.secondary, marginBottom: '10px' }}>
            Please login to comment
          </p>
          <button
            onClick={() => router.push('/login?redirect=' + encodeURIComponent(router.asPath))}
            style={{
              padding: '8px 20px',
              backgroundColor: colors.buttonBackground,
              color: colors.buttonText,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Login
          </button>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: colors.secondary }}>
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: '15px',
                backgroundColor: colors.inputBackground,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    color: colors.secondary,
                    marginBottom: '5px'
                  }}>
                    {formatDate(comment.created_at)}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.text,
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {comment.content}
                  </div>
                </div>
                {currentUserId === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginLeft: '10px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    title="Delete comment"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
