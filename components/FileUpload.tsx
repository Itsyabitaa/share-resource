import React, { useEffect } from 'react'
import { useSession } from '../lib/auth-client'

interface FileUploadProps {
  uploadedFile: File | null
  isConverting: boolean
  showAuthor: boolean
  author: string
  autoFormat: boolean
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onShowAuthorChange: (checked: boolean) => void
  onAuthorChange: (value: string) => void
  onAutoFormatChange: (checked: boolean) => void
}

export default function FileUpload({
  uploadedFile,
  isConverting,
  showAuthor,
  author,
  autoFormat,
  onFileUpload,
  onShowAuthorChange,
  onAuthorChange,
  onAutoFormatChange
}: FileUploadProps) {
  const { data: session } = useSession()

  useEffect(() => {
    if (showAuthor && session?.user?.name && !author) {
      onAuthorChange(session.user.name)
    }
  }, [showAuthor, session?.user?.name, author, onAuthorChange])

  return (
    <div className="composer-stage-body">
      <input
        type="file"
        accept=".txt,.doc,.docx,.md,.pdf,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFileUpload}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`dropzone${isConverting ? ' is-busy' : ''}`}
      >
        <p className="composer-kicker">{isConverting ? 'Working' : 'Bring a file'}</p>
        <h2>{isConverting ? 'Turning it into markdown…' : 'Drop a document in the nest'}</h2>
        <p>TXT, Markdown, Word, or PDF — up to 10 MB.</p>
        <span className="dropzone-btn">{isConverting ? 'Converting' : 'Choose file'}</span>
        {uploadedFile && (
          <p style={{ marginTop: 14 }}>{uploadedFile.name}</p>
        )}
      </label>

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
          className={`chip${autoFormat ? ' is-on' : ''}`}
          aria-pressed={autoFormat}
          onClick={() => onAutoFormatChange(!autoFormat)}
        >
          Auto-format
        </button>
      </div>

      {showAuthor && (
        <input
          className="composer-field"
          type="text"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="Your name or handle"
        />
      )}
    </div>
  )
}
