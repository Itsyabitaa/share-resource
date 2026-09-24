import React, { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from '../lib/auth-client'
import { formatToMarkdown } from '../utils/markdownFormatter'
import KimemAiPanel from './KimemAiPanel'
import type { UserPlan } from '../lib/storagePolicy'

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false })
import 'easymde/dist/easymde.min.css'

interface MarkdownEditorProps {
  text: string
  title: string
  author: string
  showAuthor: boolean
  isPublic: boolean
  listOnExplore?: boolean
  hashtags: string[]
  onTextChange: (value: string) => void
  onTitleChange: (value: string) => void
  onAuthorChange: (value: string) => void
  onShowAuthorChange: (checked: boolean) => void
  onIsPublicChange: (checked: boolean) => void
  onListOnExploreChange?: (checked: boolean) => void
  onHashtagsChange: (hashtags: string[]) => void
  userPlan?: UserPlan | null
}

export default function MarkdownEditor({
  text,
  title,
  author,
  showAuthor,
  isPublic,
  listOnExplore = false,
  hashtags,
  onTextChange,
  onTitleChange,
  onAuthorChange,
  onShowAuthorChange,
  onIsPublicChange,
  onListOnExploreChange,
  onHashtagsChange,
  userPlan = null,
}: MarkdownEditorProps) {
  const { data: session } = useSession()
  const [formatStatus, setFormatStatus] = useState<'idle' | 'done' | 'same'>('idle')

  useEffect(() => {
    if (showAuthor && session?.user?.name && !author) {
      onAuthorChange(session.user.name)
    }
  }, [showAuthor, session?.user?.name, author, onAuthorChange])

  useEffect(() => {
    if (formatStatus === 'idle') return
    const timer = setTimeout(() => setFormatStatus('idle'), 1800)
    return () => clearTimeout(timer)
  }, [formatStatus])

  const handleTextChange = useCallback((value: string) => {
    onTextChange(value)
  }, [onTextChange])

  const handleFormatText = useCallback(() => {
    if (!text.trim()) return
    const formatted = formatToMarkdown(text)
    if (formatted === text) {
      setFormatStatus('same')
      return
    }
    onTextChange(formatted)
    setFormatStatus('done')
  }, [text, onTextChange])

  const mdeOptions = React.useMemo(() => ({
    spellChecker: false,
    placeholder: 'The page is blank. Begin anywhere…',
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ] as const,
    status: ['lines', 'words'] as const,
    autoDownloadFontAwesome: true,
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: true,
    },
    minHeight: '360px'
  }), [])

  return (
    <div className="composer-stage-body">
      <label className="composer-title-label" htmlFor="document-title">Title</label>
      <input
        id="document-title"
        className="composer-title-input"
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled nest"
      />

      <div className="composer-meta">
        <button
          type="button"
          className={`chip${showAuthor ? ' is-on' : ''}`}
          aria-pressed={showAuthor}
          onClick={() => onShowAuthorChange(!showAuthor)}
        >
          Author
        </button>
        <button
          type="button"
          className={`chip${isPublic ? ' is-on' : ''}`}
          aria-pressed={isPublic}
          title="Anyone with the link can open this nest. It stays off Explore."
          onClick={() => onIsPublicChange(!isPublic)}
        >
          Public
        </button>
        <button
          type="button"
          className={`chip${listOnExplore ? ' is-on' : ''}`}
          aria-pressed={listOnExplore}
          title="Show this nest on the Explore page. Off unless you turn it on."
          onClick={() => onListOnExploreChange?.(!listOnExplore)}
        >
          Explore
        </button>
        <button
          type="button"
          className={`ghost-btn${formatStatus === 'done' ? ' is-on' : ''}`}
          onClick={handleFormatText}
          disabled={!text.trim()}
          title="Convert plain text into clean markdown (headings, lists, links, code)"
        >
          {formatStatus === 'done' ? 'Formatted' : formatStatus === 'same' ? 'Already clean' : 'Auto-format'}
        </button>
      </div>
      <p className="composer-visibility-hint">
        Public shares a link. Explore lists it only when you turn Explore on.
      </p>

      {showAuthor && (
        <input
          className="composer-field"
          type="text"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="Your name or handle"
        />
      )}

      {isPublic && (
        <input
          className="composer-field"
          type="text"
          value={hashtags.join(', ')}
          onChange={(e) => {
            const hashtagList = e.target.value
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
            onHashtagsChange(hashtagList)
          }}
          placeholder="Tags for Explore — design, notes, tutorial"
        />
      )}

      <div className="composer-editor-shell">
        <div className="editor-container">
          <SimpleMDE
            value={text}
            onChange={handleTextChange}
            options={mdeOptions}
          />
        </div>
      </div>

      <KimemAiPanel
        markdown={text}
        title={title}
        userPlan={userPlan}
        onApplyMarkdown={onTextChange}
      />
    </div>
  )
}
