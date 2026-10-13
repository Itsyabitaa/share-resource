import { GetServerSideProps } from 'next'
import { canAccessFile, getFileById } from '../../lib/dbSchema'
import { auth } from '../../lib/auth'
import { isAdminEmail } from '../../lib/admin'
import { COMMUNITY_TAKEDOWN_MESSAGE, isFileRemoved } from '../../lib/moderation'
import { extractHeadings } from '../../lib/toc'
import MarkdownDocument from '../../components/MarkdownDocument'
import { useTheme } from '../../lib/ThemeContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../../lib/auth-client'
import { useAppPaths } from '../../lib/appPaths'
import Link from 'next/link'
import { daysUntilExpiry } from '../../lib/storagePolicy'
import { confirmAction } from '../../lib/swal'

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
          listedOnExplore: false,
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
        listedOnExplore: !!fileData.listed_on_explore,
        allowPdfExport: !!fileData.allow_pdf_export,
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
  listedOnExplore?: boolean
  allowPdfExport?: boolean
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
    listedOnExplore = false,
    allowPdfExport = false,
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
  const headings = extractHeadings(content).filter((heading, index) => {
    if (index !== 0 || heading.level !== 1) return true
    return heading.text.trim().toLowerCase() !== title.trim().toLowerCase()
  })
  const daysLeft = daysUntilExpiry(expiresAt)
  const recordNo = fileId.replace(/-/g, '').slice(0, 8).toUpperCase()

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
  const [pdfAllowed, setPdfAllowed] = useState(allowPdfExport)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [menu, setMenu] = useState<'download' | 'manage' | null>(null)
  const canDownloadPdf = !!props.isGuestPost || pdfAllowed
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

  const handleExportPdf = async () => {
    if (!canDownloadPdf || pdfBusy) return
    setPdfBusy(true)
    try {
      const { downloadMarkdownPdf } = await import('../../utils/markdownPdf')
      downloadMarkdownPdf({ title, markdown: content, fileId })
    } finally {
      setPdfBusy(false)
    }
  }

  const togglePdfExport = async () => {
    const next = !pdfAllowed
    setPdfAllowed(next)
    const res = await fetch(apiPath(`/files/${fileId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowPdfExport: next }),
    })
    if (!res.ok) setPdfAllowed(!next)
  }

  const handleDeleteFile = async () => {
    const ok = await confirmAction({
      title: 'Delete document?',
      text: 'This document will be deleted permanently. This cannot be undone.',
      confirmText: 'Yes, delete',
      danger: true,
      icon: 'warning',
    })
    if (!ok) return
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
    const ok = await confirmAction({
      title: 'Delete comment?',
      text: 'This comment will be removed permanently.',
      confirmText: 'Delete',
      danger: true,
      icon: 'warning',
    })
    if (!ok) return

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
      <div className="print-mark" aria-hidden="true">md-nest</div>
      {moderationStatus === 'warned' && moderationMessage && (
        <div className="moderation-notice warned">
          <strong>Community guidelines warning:</strong> {moderationMessage}
        </div>
      )}
      <div className="file-toolbar">
        <div className="file-toolbar-inner">
          <div className="file-toolbar-left">
            <button className="text-action" type="button" onClick={() => router.push(sitePath('/'))}>
              Files
            </button>
            <span className="file-kicker">{fileType.toUpperCase()}</span>
            <div className="file-metrics">
              <span>{viewCount} {viewCount === 1 ? 'view' : 'views'}</span>
              <button className="text-action" type="button" onClick={() => setActiveTab('comments')}>
                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              </button>
              <button className="text-action" type="button" onClick={handleLike}>
                {userHasLiked ? 'Liked' : 'Like'} {likeCount}
              </button>
            </div>
          </div>

          <div className="file-toolbar-right">
            <button className="text-action" type="button" onClick={handleCopyLink}>
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <div className="tool-menu">
              <button
                className={`text-action${menu === 'download' ? ' is-on' : ''}`}
                type="button"
                aria-expanded={menu === 'download'}
                onClick={() => setMenu(menu === 'download' ? null : 'download')}
              >
                Download
              </button>
              {menu === 'download' && (
                <>
                  <button className="tool-menu-backdrop" type="button" aria-label="Close" onClick={() => setMenu(null)} />
                  <div className="tool-menu-panel" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleDownload()
                        setMenu(null)
                      }}
                    >
                      Markdown file
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleCopyMarkdown()
                        setMenu(null)
                      }}
                    >
                      {copiedMd ? 'Markdown copied' : 'Copy markdown'}
                    </button>
                    {canDownloadPdf && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={pdfBusy}
                        onClick={() => {
                          handleExportPdf()
                          setMenu(null)
                        }}
                      >
                        {pdfBusy ? 'Preparing PDF' : 'Export PDF'}
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenu(null)
                        window.print()
                      }}
                    >
                      Print
                    </button>
                  </div>
                </>
              )}
            </div>
            {isOwner && (
              <div className="tool-menu">
                <button
                  className={`text-action${menu === 'manage' ? ' is-on' : ''}`}
                  type="button"
                  aria-expanded={menu === 'manage'}
                  onClick={() => setMenu(menu === 'manage' ? null : 'manage')}
                >
                  Edit
                </button>
                {menu === 'manage' && (
                  <>
                    <button className="tool-menu-backdrop" type="button" aria-label="Close" onClick={() => setMenu(null)} />
                    <div className="tool-menu-panel" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => router.push(sitePath(`/edit/${fileId}`))}
                      >
                        Edit document
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={togglePdfExport}
                        title="Turn PDF download on or off for people who open this link"
                      >
                        {pdfAllowed ? 'PDF sharing on' : 'PDF sharing off'}
                      </button>
                      <button
                        className="is-danger"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenu(null)
                          handleDeleteFile()
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="file-layout">
        <div>
          <header className="paper-mast">
            <div className="paper-flags">
              <span>File {recordNo}</span>
              <span>{isPublic ? 'Public' : 'Private'}</span>
              {listedOnExplore && <span>On Explore</span>}
              {expiresAt && (
                <span>
                  Expires {new Date(expiresAt).toLocaleDateString()}
                  {daysLeft !== null && daysLeft <= 7 ? ` · ${daysLeft}d left` : ''}
                </span>
              )}
              {isOwner && expiresAt && (
                <Link href={sitePath('/pricing')}>Keep this nest</Link>
              )}
            </div>
            <h1 className="paper-title">{title}</h1>
            <p className="paper-meta">
              {author && <span>{author}</span>}
              <span>Created {formatWhen(createdAt)}</span>
              {updatedAt !== createdAt && <span>Revised {formatWhen(updatedAt)}</span>}
              <span>{shareCount} {shareCount === 1 ? 'copy' : 'copies'}</span>
            </p>
            <div className="paper-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={activeTab === 'document' ? 'is-active' : ''}
                aria-selected={activeTab === 'document'}
                onClick={() => setActiveTab('document')}
              >
                Document
              </button>
              <button
                type="button"
                role="tab"
                className={activeTab === 'comments' ? 'is-active' : ''}
                aria-selected={activeTab === 'comments'}
                onClick={() => setActiveTab('comments')}
              >
                Comments<em>{commentCount}</em>
              </button>
            </div>
          </header>

          <div className={`doc-card${activeTab === 'document' ? '' : ' is-print-only'}`}>
            <MarkdownDocument markdown={content} omitMatchingTitle={title} />
          </div>
          {activeTab === 'comments' && (
            <div className="paper-sheet">
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
                      className="doc-primary"
                      type="submit"
                      disabled={isSubmitting || !newComment.trim() || !session}
                    >
                      {isSubmitting ? 'Posting' : 'Post comment'}
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
                  <p style={{ color: colors.secondary, fontSize: 14, margin: 0 }}>
                    No comments yet.
                  </p>
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
                            <span>{comment.author_name || 'User'} · {new Date(comment.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>

                          {session?.user?.id && session.user.id === comment.user_id && (
                            <button className="text-action is-danger" type="button" onClick={() => handleDeleteComment(comment.id)}>
                              Delete
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

        <aside className="paper-rail">
          {headings.length > 0 && (
            <section>
              <h2>Contents</h2>
              <nav className="paper-contents">
                {headings.map(heading => (
                  <a key={heading.id} href={`#${heading.id}`} style={{ paddingLeft: (heading.level - 1) * 10 }}>
                    {heading.text}
                  </a>
                ))}
              </nav>
            </section>
          )}
          <section>
            <h2>Record</h2>
            <dl className="paper-record">
              <div><dt>File</dt><dd>{recordNo}</dd></div>
              <div><dt>Type</dt><dd>{fileType.toUpperCase()}</dd></div>
              {author && <div><dt>Author</dt><dd>{author}</dd></div>}
              <div><dt>Views</dt><dd>{viewCount}</dd></div>
              <div><dt>Copies</dt><dd>{shareCount}</dd></div>
              <div><dt>Likes</dt><dd>{likeCount}</dd></div>
              <div><dt>Created</dt><dd>{formatWhen(createdAt)}</dd></div>
              <div><dt>Revised</dt><dd>{formatWhen(updatedAt)}</dd></div>
            </dl>
          </section>
          {(docStats?.timeline?.length ?? 0) > 0 && (
            <section className="doc-timeline">
              <h2>Timeline</h2>
              <ol className="doc-timeline-list">
                {docStats!.timeline.map((entry) => (
                  <li key={entry.id} className="doc-timeline-item">
                    <span className="doc-timeline-dot" aria-hidden />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.label}</div>
                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{formatWhen(entry.at)}</div>
                      {entry.title && entry.kind !== 'create' && (
                        <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>{entry.title}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
