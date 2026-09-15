import { GetServerSideProps } from 'next'
import { canAccessFile, getAccessibleFile, getFileById } from '../../lib/dbSchema'
import { auth } from '../../lib/auth'
import { isAdminEmail } from '../../lib/admin'
import { COMMUNITY_TAKEDOWN_MESSAGE, isFileRemoved } from '../../lib/moderation'
import { extractHeadings } from '../../lib/toc'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useTheme } from '../../lib/ThemeContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../../lib/auth-client'
import { useAppPaths } from '../../lib/appPaths'
import Link from 'next/link'
import { daysUntilExpiry } from '../../lib/storagePolicy'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
}

interface TimelineEntry {
  id: string
  kind: 'create' | 'content' | 'metadata'
  label: string
  at: string
  title?: string | null
}

interface DocStats {
  viewCount: number
  shareCount: number
  editCount: number
  createdAt: string
  updatedAt: string
  timeline: TimelineEntry[]
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id as string

  try {
    const session = await auth.api.getSession({
      headers: context.req.headers as any
    })
    const fileData = await getFileById(id)
    const isAdmin = isAdminEmail(session?.user?.email)

    if (!fileData) {
      return { notFound: true }
    }

    if (isFileRemoved(fileData.moderation_status) && !isAdmin) {
      return {
        props: {
          moderated: true,
          fileId: id,
          title: fileData.title,
          moderationMessage: fileData.moderation_reason || COMMUNITY_TAKEDOWN_MESSAGE,
          isGuestPost: !fileData.user_id,
          content: '',
          author: fileData.author || null,
          fileType: fileData.file_type,
          createdAt: fileData.created_at,
          updatedAt: fileData.updated_at,
          isPublic: false,
          expiresAt: null,
          isOwner: false,
          initialViewCount: 0,
          initialShareCount: 0,
        },
      }
    }

    if (!canAccessFile(fileData, session?.user?.id, { isAdmin })) {
      return { notFound: true }
    }

    const response = await fetch(fileData.cloudinary_url)
    const content = await response.text()

    return {
      props: {
        moderated: false,
        fileId: id,
        content,
        title: fileData.title,
        author: fileData.author,
        fileType: fileData.file_type,
        createdAt: fileData.created_at,
        updatedAt: fileData.updated_at,
        isPublic: !!fileData.is_public,
        expiresAt: fileData.expires_at || null,
        isOwner: !!session?.user?.id && session.user.id === fileData.user_id,
        initialViewCount: fileData.view_count ?? 0,
        initialShareCount: fileData.share_count ?? 0,
        moderationMessage: fileData.moderation_reason || null,
        moderationStatus: fileData.moderation_status || 'active',
        isGuestPost: !fileData.user_id,
      },
    }
  } catch (error) {
    console.error('Error fetching file:', error)
    return {
      notFound: true
    }
  }
}

function ModeratedFileScreen({
  moderationMessage,
  isGuestPost,
}: {
  moderationMessage?: string | null
  isGuestPost?: boolean
}) {
  const { sitePath } = useAppPaths()

  return (
    <div className="page-shell" style={{ maxWidth: 640, margin: '48px auto', textAlign: 'center' }}>
      <div className="moderation-notice removed">
        <p className="composer-kicker">Unavailable</p>
        <h1 className="page-title">Content removed</h1>
        <p className="page-subtitle">{moderationMessage || COMMUNITY_TAKEDOWN_MESSAGE}</p>
        {isGuestPost && (
          <p style={{ opacity: 0.75, marginTop: 12 }}>
            This was a guest post and is no longer available.
          </p>
        )}
        <Link href={sitePath('/')} className="header-btn primary" style={{ display: 'inline-block', marginTop: 24 }}>
          Back to md-nest
        </Link>
      </div>
    </div>
  )
}

export default function FilePage(props: {
  moderated?: boolean
  fileId: string
  content: string
  title: string
  author?: string | null
  fileType: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  expiresAt: string | null
  isOwner: boolean
  initialViewCount: number
  initialShareCount: number
  moderationMessage?: string | null
  moderationStatus?: string | null
  isGuestPost?: boolean
}) {
  if (props.moderated) {
    return (
      <ModeratedFileScreen
        moderationMessage={props.moderationMessage}
        isGuestPost={props.isGuestPost}
      />
    )
  }

  const {
    fileId,
    content,
    title,
    author,
    fileType,
    createdAt,
    updatedAt,
    isPublic,
    expiresAt,
    isOwner,
    initialViewCount,
    initialShareCount,
    moderationMessage,
    moderationStatus,
  } = props
  const { colors } = useTheme()
  const [copied, setCopied] = useState(false)
  const [copiedMd, setCopiedMd] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const router = useRouter()
  const { data: session } = useSession()
  const { apiPath, sitePath } = useAppPaths()
  const headings = extractHeadings(content)
  const daysLeft = daysUntilExpiry(expiresAt)

  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [userHasLiked, setUserHasLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'document' | 'comments'>('document')
  const [viewCount, setViewCount] = useState(initialViewCount)
  const [shareCount, setShareCount] = useState(initialShareCount)
  const [docStats, setDocStats] = useState<DocStats | null>(null)

  useEffect(() => {
    setCurrentUrl(window.location.href)
    loadSocialData()
    loadDocStats()
  }, [fileId])

  const loadDocStats = async () => {
    try {
      await fetch(apiPath(`/files/${fileId}/track`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          if (typeof data.viewCount === 'number') setViewCount(data.viewCount)
          if (typeof data.shareCount === 'number') setShareCount(data.shareCount)
        }
      })

      const statsRes = await fetch(apiPath(`/files/${fileId}/stats`))
      if (statsRes.ok) {
        const stats = await statsRes.json()
        setDocStats(stats)
        setViewCount(stats.viewCount ?? viewCount)
        setShareCount(stats.shareCount ?? shareCount)
      }
    } catch (error) {
      console.error('Error loading document stats:', error)
    }
  }

  const loadSocialData = async () => {
    try {
      const likeRes = await fetch(apiPath(`/likes?fileId=${fileId}`))
      if (likeRes.ok) {
        const likeData = await likeRes.json()
        setLikeCount(likeData.likeCount)
        setUserHasLiked(likeData.userHasLiked)
      }

      const commentRes = await fetch(apiPath(`/comments?fileId=${fileId}`))
      if (commentRes.ok) {
        const commentData = await commentRes.json()
        setComments(commentData.comments)
        setCommentCount(commentData.comments.length)
      }
    } catch (error) {
      console.error('Error loading social data:', error)
    }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    try {
      const res = await fetch(apiPath(`/files/${fileId}/track`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' }),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.shareCount === 'number') setShareCount(data.shareCount)
      }
    } catch (error) {
      console.error('Error tracking share:', error)
    }
  }

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(content)
    setCopiedMd(true)
    setTimeout(() => setCopiedMd(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'document'}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteFile = async () => {
    if (!confirm('Delete this document permanently?')) return
    const res = await fetch(apiPath(`/files/${fileId}`), { method: 'DELETE' })
    if (res.ok) router.push(sitePath('/workspace'))
  }

  const handleLike = async () => {
    try {
      const res = await fetch(apiPath('/likes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })

      if (res.status === 401) {
        router.push(sitePath('/login'))
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
      const res = await fetch(apiPath('/comments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, content: newComment })
      })

      if (res.status === 401) {
        router.push(sitePath('/login'))
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
      const res = await fetch(apiPath(`/comments?id=${commentId}`), {
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
    <div className="file-page">
      {moderationStatus === 'warned' && moderationMessage && (
        <div className="moderation-notice warned">
          <strong>Community guidelines warning:</strong> {moderationMessage}
        </div>
      )}
      <div className="file-toolbar">
        <div className="file-toolbar-inner">
          <div className="file-toolbar-left">
            <button
              onClick={() => router.push(sitePath('/'))}
              className="header-btn"
              type="button"
            >
              ← Files
            </button>

            <span className="header-btn" style={{ cursor: 'default', opacity: 0.8 }}>
              {fileType.toUpperCase()}
            </span>
          </div>

          <div className="file-toolbar-right">
            <button
              onClick={handleLike}
              className="header-btn"
              type="button"
              style={{ color: userHasLiked ? '#ef4444' : undefined }}
            >
              {userHasLiked ? '♥' : '♡'} {likeCount}
            </button>
            <span className="header-btn" style={{ cursor: 'default' }}>
              👁 {viewCount}
            </span>
            <span className="header-btn" style={{ cursor: 'default' }}>
              🔗 {shareCount}
            </span>
            <span className="header-btn" style={{ cursor: 'default' }}>
              💬 {commentCount}
            </span>
            <button
              onClick={handleCopyLink}
              className={`header-btn${copied ? ' primary' : ''}`}
              type="button"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button className="header-btn" type="button" onClick={handleCopyMarkdown}>
              {copiedMd ? 'Copied md' : 'Copy md'}
            </button>
            <button className="header-btn" type="button" onClick={handleDownload}>
              Download
            </button>
            {isOwner && (
              <>
                <button className="header-btn" type="button" onClick={() => router.push(sitePath(`/edit/${fileId}`))}>
                  Edit
                </button>
                <button className="header-btn" type="button" onClick={handleDeleteFile}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="file-layout">
        <div>
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
                  fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: '12px',
                  lineHeight: '1.3',
                  overflowWrap: 'anywhere'
                }}>
                  {title}
                </h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
                  <span className="header-btn" style={{ cursor: 'default' }}>{isPublic ? 'Public' : 'Private'}</span>
                  {expiresAt && (
                    <span className="header-btn" style={{ cursor: 'default' }}>
                      Expires {new Date(expiresAt).toLocaleDateString()}
                      {daysLeft !== null && daysLeft <= 7 ? ` (${daysLeft}d left)` : ''}
                    </span>
                  )}
                  {isOwner && expiresAt && (
                    <Link href={sitePath('/pricing')} className="header-btn primary">
                      Upgrade to Pro
                    </Link>
                  )}
                </div>

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
                    <span>Created {formatWhen(createdAt)}</span>
                  </div>
                  {updatedAt !== createdAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '18px' }}>✏️</span>
                      <span>Updated {formatWhen(updatedAt)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px' }}>👁</span>
                    <span>{viewCount} {viewCount === 1 ? 'view' : 'views'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px' }}>🔗</span>
                    <span>{shareCount} {shareCount === 1 ? 'share' : 'shares'}</span>
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
                      color: activeTab === 'document' ? colors.buttonText : colors.text,
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
                      color: activeTab === 'comments' ? colors.buttonText : colors.text,
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

          {activeTab === 'document' ? (
            <div
              className="doc-card"
              style={{
                backgroundColor: colors.cardBackground,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                minHeight: '320px'
              }}
            >
              <div className="markdown-body" style={{ color: colors.text }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    h1: ({ children, ...props }) => <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} {...props}>{children}</h1>,
                    h2: ({ children, ...props }) => <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} {...props}>{children}</h2>,
                    h3: ({ children, ...props }) => <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} {...props}>{children}</h3>,
                  }}
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
                    placeholder={session ? 'Share your thoughts on this document...' : 'Sign in to add a comment'}
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
                            <span>{comment.author_name || 'User'} • {new Date(comment.created_at).toLocaleString('en-US', {
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

        <div style={{
          position: 'sticky',
          top: '120px',
          height: 'fit-content'
        }}>
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

            {headings.length > 0 && (
              <nav style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>On this page</div>
                {headings.map(heading => (
                  <div key={heading.id} style={{ paddingLeft: (heading.level - 1) * 12, marginBottom: 6, fontSize: 14 }}>
                    <a href={`#${heading.id}`} style={{ color: colors.link }}>{heading.text}</a>
                  </div>
                ))}
              </nav>
            )}

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
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Views</span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{viewCount}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${colors.border}`
              }}>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Link copies</span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{shareCount}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${colors.border}`
              }}>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Created</span>
                <span style={{ fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>{formatWhen(createdAt)}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${colors.border}`
              }}>
                <span style={{ color: colors.secondary, fontSize: '14px' }}>Last updated</span>
                <span style={{ fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>{formatWhen(updatedAt)}</span>
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

            {(docStats?.timeline?.length ?? 0) > 0 && (
              <div className="doc-timeline" style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>Timeline</div>
                <ol className="doc-timeline-list">
                  {docStats!.timeline.map((entry) => (
                    <li key={entry.id} className="doc-timeline-item">
                      <span className="doc-timeline-dot" aria-hidden />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.label}</div>
                        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{formatWhen(entry.at)}</div>
                        {entry.title && entry.kind !== 'create' && (
                          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>{entry.title}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

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
