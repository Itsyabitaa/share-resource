import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession } from '../lib/auth-client'
import { useAppPaths } from '../lib/appPaths'
import { FREE_MAX_PHOTO_CONVERSIONS, photoConversionsRemaining } from '../lib/planLimits'

interface FileUploadProps {
  uploadedFile: File | null
  isConverting: boolean
  conversionStatus?: string
  photoToMarkdownEnabled?: boolean
  userPlan?: 'free' | 'pro' | null
  photoConversionsUsed?: number
  showAuthor: boolean
  author: string
  autoFormat: boolean
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onShowAuthorChange: (checked: boolean) => void
  onAuthorChange: (value: string) => void
  onAutoFormatChange: (checked: boolean) => void
}

const DOCUMENT_ACCEPT =
  '.txt,.doc,.docx,.md,.pdf,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const DOCUMENT_WITH_PHOTOS_ACCEPT =
  `${DOCUMENT_ACCEPT},.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/*`

export default function FileUpload({
  uploadedFile,
  isConverting,
  conversionStatus,
  photoToMarkdownEnabled = false,
  userPlan = null,
  photoConversionsUsed = 0,
  showAuthor,
  author,
  autoFormat,
  onFileUpload,
  onShowAuthorChange,
  onAuthorChange,
  onAutoFormatChange,
}: FileUploadProps) {
  const { data: session } = useSession()
  const { sitePath } = useAppPaths()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAuthor && session?.user?.name && !author) {
      onAuthorChange(session.user.name)
    }
  }, [showAuthor, session?.user?.name, author, onAuthorChange])

  const busyLabel = conversionStatus || (isConverting ? 'Turning it into markdown…' : 'Drop a document in the nest')
  const busyKicker = isConverting ? 'Working' : 'Bring a file'
  const photosLeft =
    userPlan === 'free' ? photoConversionsRemaining('free', photoConversionsUsed) : null

  return (
    <div className="composer-stage-body">
      <input
        ref={fileInputRef}
        type="file"
        accept={photoToMarkdownEnabled ? DOCUMENT_WITH_PHOTOS_ACCEPT : DOCUMENT_ACCEPT}
        onChange={onFileUpload}
        style={{ display: 'none' }}
        id="file-upload"
      />
      {photoToMarkdownEnabled && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileUpload}
          style={{ display: 'none' }}
          id="camera-upload"
        />
      )}

      <div className={`dropzone${isConverting ? ' is-busy' : ''}`}>
        <p className="composer-kicker">{busyKicker}</p>
        <h2>{busyLabel}</h2>
        <p>
          {photoToMarkdownEnabled
            ? userPlan === 'pro'
              ? 'Documents or photos — up to 10 MB. Unlimited photo scans on Pro.'
              : `Documents or photos — up to 10 MB. Free plan: ${photosLeft ?? 0} of ${FREE_MAX_PHOTO_CONVERSIONS} photo scans left.`
            : 'TXT, Markdown, Word, or PDF — up to 10 MB.'}
        </p>

        <div className="dropzone-actions">
          <button
            type="button"
            className="dropzone-btn"
            disabled={isConverting}
            onClick={() => fileInputRef.current?.click()}
          >
            {isConverting ? 'Converting' : 'Choose file'}
          </button>
          {photoToMarkdownEnabled && (
            <button
              type="button"
              className="dropzone-btn dropzone-btn-secondary"
              disabled={isConverting}
              onClick={() => cameraInputRef.current?.click()}
            >
              Take photo
            </button>
          )}
        </div>

        {!photoToMarkdownEnabled && (
          <p className="dropzone-pro-note">
            {!session?.user ? (
              <>
                <Link href={sitePath('/login')}>Sign in</Link> to scan photos (Free: {FREE_MAX_PHOTO_CONVERSIONS} scans).
              </>
            ) : userPlan === 'free' ? (
              <>
                You used all {FREE_MAX_PHOTO_CONVERSIONS} photo scans on Free.{' '}
                <Link href={sitePath('/pricing')}>Upgrade to Pro</Link> for unlimited scans.
              </>
            ) : null}
          </p>
        )}

        {uploadedFile && (
          <p className="dropzone-filename">{uploadedFile.name}</p>
        )}
      </div>

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
