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

  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [userHasLiked, setUserHasLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'document' | 'comments'>('document')

  useEffect(() => {
    setCurrentUrl(window.location.href)
    loadSocialData()
  }, [fileId])

  const loadSocialData = async () => {
    try {
      const likeRes = await fetch(`/api/likes?fileId=${fileId}`)
      if (likeRes.ok) {
        const likeData = await likeRes.json()
        setLikeCount(likeData.likeCount)
        setUserHasLiked(likeData.userHasLiked)
      }

      const commentRes = await fetch(`/api/comments?fileId=${fileId}`)
      if (commentRes.ok) {
        const commentData = await commentRes.json()
        setComments(commentData.comments)
        setCommentCount(commentData.comments.length)
      }
    } catch (error) {
      console.error('Error loading social data:', error)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

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
        const errorData = await res.json()
        setError(errorData.error || 'Failed to post comment')
      }
    } catch (error) {
      setError('An error occurred while posting your comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const res = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId))
        setCommentCount(commentCount - 1)
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      color: colors.text,
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      {/* Fixed Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: colors.background,
        borderBottom: `1px solid ${colors.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '10px 20px',
                fontSize: '15px',
                backgroundColor: 'transparent',
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.border
                e.currentTarget.style.transform = 'translateX(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.transform = 'translateX(0)'
              }}
            >
              ← Back to Files
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <span style={{ fontWeight: '600', color: colors.secondary }}>📄</span>
              <span>{fileType.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px'
            }}>
              <button
                onClick={handleLike}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: userHasLiked ? '#ef4444' : colors.text,
                  cursor: 'pointer',
                  fontSize: '15px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span style={{ fontSize: '18px' }}>{userHasLiked ? '❤️' : '🤍'}</span>
                <span>{likeCount}</span>
              </button>
              
              <div style={{ width: '1px', height: '20px', backgroundColor: colors.border }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                <span style={{ fontSize: '18px' }}>💬</span>
                <span>{commentCount}</span>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: copied ? '#10b981' : colors.background,
                color: copied ? '#fff' : colors.text,
                border: `1px solid ${copied ? '#10b981' : colors.border}`,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.backgroundColor = colors.border
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.backgroundColor = colors.background
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {copied ? '✓ Copied!' : '🔗 Share Link'}
            </button>

            <button
              onClick={toggleTheme}
              style={{
                padding: '10px 12px',
                fontSize: '18px',
                backgroundColor: colors.background,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.border
                e.currentTarget.style.transform = 'rotate(15deg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.background
                e.currentTarget.style.transform = 'rotate(0)'
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '32px',
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '32px'
      }}>
        {/* Left Column - Main Content */}
        <div>
          {/* Document Header */}
          <div style={{
            marginBottom: 32,
            padding: '32px',
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h1 style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: colors.text,
                  marginBottom: '12px',
                  lineHeight: '1.3'
                }}>
                  {title}
                </h1>

                <div style={{
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: colors.secondary,
                  marginBottom: '20px'
                }}>
                  {author && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '18px' }}>👤</span>
                      <span style={{ fontWeight: '500' }}>{author}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px' }}>📅</span>
                    <span>{new Date(createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => setActiveTab('document')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '15px',
                      backgroundColor: activeTab === 'document' ? colors.primary : 'transparent',
                      color: activeTab === 'document' ? '#000' : colors.text,
                      border: `2px solid ${activeTab === 'document' ? colors.primary : colors.border}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📄 Document
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '15px',
                      backgroundColor: activeTab === 'comments' ? colors.primary : 'transparent',
                      color: activeTab === 'comments' ? '#000' : colors.text,
                      border: `2px solid ${activeTab === 'comments' ? colors.primary : colors.border}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    💬 Comments ({commentCount})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {activeTab === 'document' ? (
            <div style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              minHeight: '500px'
            }}>
              <div style={{
                fontSize: '16px',
                lineHeight: '1.8',
                color: colors.text
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
              {/* Comment Form */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: '16px'
                }}>
                  Add a comment
                </h3>
                <form onSubmit={handleCommentSubmit}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={session ? "Share your thoughts on this document..." : "Sign in to add a comment"}
                    disabled={!session}
                    style={{
                      width: '100%',
                      minHeight: 100,
                      padding: '16px',
                      fontSize: '15px',
                      backgroundColor: colors.background,
                      color: colors.text,
                      border: `2px solid ${colors.border}`,
                      borderRadius: '12px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      marginBottom: 16,
                      transition: 'border-color 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.primary
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                    }}
                    maxLength={1000}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: colors.secondary }}>
                      {newComment.length}/1000 characters
                    </span>

                    {error && (
                      <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim() || !session}
                      style={{
                        padding: '12px 32px',
                        fontSize: '15px',
                        backgroundColor: colors.primary,
                        color: '#000000',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: isSubmitting || !newComment.trim() || !session ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        opacity: isSubmitting || !newComment.trim() || !session ? 0.5 : 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting && newComment.trim() && session) {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {isSubmitting ? '✍️ Posting...' : '📤 Post Comment'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Comments List */}
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: '24px'
                }}>
                  All Comments ({comments.length})
                </h3>

                {comments.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: colors.secondary,
                    border: `2px dashed ${colors.border}`,
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💭</div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                      No comments yet
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.7 }}>
                      Be the first to share your thoughts!
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        style={{
                          padding: '20px',
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '12px',
                          transition: 'all 0.3s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
                          e.currentTarget.style.borderColor = colors.primary
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.borderColor = colors.border
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            fontSize: '13px',
                            color: colors.secondary,
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '16px' }}>👤</span>
                            <span>User • {new Date(comment.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>

                          {session?.user?.id && session.user.id === comment.user_id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: `1px solid #ef4444`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontWeight: '500'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#ef4444'
                                e.currentTarget.style.color = '#fff'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = '#ef4444'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>

                        <div style={{
                          color: colors.text,
                          whiteSpace: 'pre-wrap',
                          fontSize: '15px',
                          lineHeight: '1.6',
                          paddingLeft: '8px',
                          borderLeft: `3px solid ${colors.primary}`
                        }}>
                          {comment.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div style={{
          position: 'sticky',
          top: '120px',
          height: 'fit-content'
        }}>
          {/* Document Info Card */}
          <div style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 Document Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${colors.border}`
              }}>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Type</span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{fileType.toUpperCase()}</span>
              </div>

              {author && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: `1px solid ${colors.border}`
                }}>
                  <span style={{ color: colors.secondary, fontSize: '14px' }}>Author</span>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{author}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${colors.border}`
              }}>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Created</span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{new Date(createdAt).toLocaleDateString()}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Likes</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{userHasLiked ? '❤️' : '🤍'}</span>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{likeCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLike}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                backgroundColor: userHasLiked ? '#ef4444' : colors.background,
                color: userHasLiked ? '#fff' : colors.text,
                border: `2px solid ${userHasLiked ? '#ef4444' : colors.primary}`,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '24px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!userHasLiked) {
                  e.currentTarget.style.backgroundColor = colors.primary
                  e.currentTarget.style.color = '#000'
                }
              }}
              onMouseLeave={(e) => {
                if (!userHasLiked) {
                  e.currentTarget.style.backgroundColor = colors.background
                  e.currentTarget.style.color = colors.text
                }
              }}
            >
              {userHasLiked ? '❤️ Liked' : '🤍 Like this Document'}
            </button>
          </div>

          {/* Quick Actions Card */}
          <div style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚡ Quick Actions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.border
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <span>🖨️ Print Document</span>
                <span>⌘P</span>
              </button>

              <button
                onClick={handleCopyLink}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.border
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <span>🔗 Copy Link</span>
                <span>⌘C</span>
              </button>

              <button
                onClick={() => setActiveTab('comments')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  backgroundColor: colors.background,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.border
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <span>💬 View Comments</span>
                <span>({commentCount})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}