import React, { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '../lib/ThemeContext'

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false })
import 'easymde/dist/easymde.min.css'

interface MarkdownEditorProps {
  text: string
  title: string
  author: string
  showAuthor: boolean
  isPublic: boolean
  hashtags: string[]
  onTextChange: (value: string) => void
  onTitleChange: (value: string) => void
  onAuthorChange: (value: string) => void
  onShowAuthorChange: (checked: boolean) => void
  onIsPublicChange: (checked: boolean) => void
  onHashtagsChange: (hashtags: string[]) => void
}

export default function MarkdownEditor({
  text,
  title,
  author,
  showAuthor,
  isPublic,
  hashtags,
  onTextChange,
  onTitleChange,
  onAuthorChange,
  onShowAuthorChange,
  onIsPublicChange,
  onHashtagsChange
}: MarkdownEditorProps) {
  const { colors } = useTheme()

  // Stable onChange handler to prevent cursor issues
  const handleTextChange = useCallback((value: string) => {
    onTextChange(value)
  }, [onTextChange])

  // Memoize options to prevent unnecessary re-renders
  const mdeOptions = React.useMemo(() => ({
    spellChecker: false,
    placeholder: 'Write your markdown here...',
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ] as const,
    status: ['lines', 'words', 'cursor'] as const,
    autoDownloadFontAwesome: true,
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: true,
    },
    minHeight: '300px'
  }), [])

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Title and Author Fields */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            color: colors.text,
            fontWeight: '500'
          }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter document title..."
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              backgroundColor: colors.inputBackground,
              color: colors.text,
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border
            }}
          />
        </div>
        
        <div style={{ marginBottom: 15 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '5px'
          }}>
            <input
              type="checkbox"
              id="show-author"
              checked={showAuthor}
              onChange={(e) => onShowAuthorChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label 
              htmlFor="show-author" 
              style={{ 
                color: colors.text,
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Add author acknowledgment
            </label>
          </div>
          
          {showAuthor && (
            <input
              type="text"
              value={author}
              onChange={(e) => onAuthorChange(e.target.value)}
              placeholder="Enter your name or handle..."
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '5px',
                backgroundColor: colors.inputBackground,
                color: colors.text,
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border
              }}
            />
          )}
        </div>

        {/* Public/Private Toggle */}
        <div style={{ marginBottom: 15 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '5px'
          }}>
            <input
              type="checkbox"
              id="is-public"
              checked={isPublic}
              onChange={(e) => onIsPublicChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label 
              htmlFor="is-public" 
              style={{ 
                color: colors.text,
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Make this document public (appears in explore)
            </label>
          </div>
        </div>

        {/* Hashtags Input */}
        {isPublic && (
          <div style={{ marginBottom: 15 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              color: colors.text,
              fontWeight: '500'
            }}>
              Hashtags (comma separated)
            </label>
            <input
              type="text"
              value={hashtags.join(', ')}
              onChange={(e) => {
                const hashtagList = e.target.value
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0)
                onHashtagsChange(hashtagList)
              }}
              placeholder="technology, ai, tutorial..."
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '5px',
                backgroundColor: colors.inputBackground,
                color: colors.text,
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border
              }}
            />
          </div>
        )}
      </div>
      
      <style jsx>{`
        .editor-container :global(.CodeMirror) {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          background-color: ${colors.inputBackground};
          color: ${colors.text};
          border: 1px solid ${colors.border};
          border-radius: 5px;
        }
        .editor-container :global(.CodeMirror-cursor) {
          border-left: 2px solid ${colors.primary};
        }
        .editor-container :global(.CodeMirror-focused) {
          border-color: ${colors.primary};
          outline: none;
        }
      `}</style>
      <div className="editor-container">
        <SimpleMDE 
          value={text} 
          onChange={handleTextChange} 
          options={mdeOptions}
        />
      </div>
    </div>
  )
}
