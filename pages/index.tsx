import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'
import { useSession } from '../lib/auth-client'
import Navbar from '../components/Navbar'
import { handleFileUpload, handleSave } from '../utils/fileHandlers'
import Link from 'next/link'
import ModeSelector from '../components/ModeSelector'
import FileUpload from '../components/FileUpload'
import MarkdownEditor from '../components/MarkdownEditor'
import ShareButton from '../components/ShareButton'
import FolderSelect from '../components/FolderSelect'
import PageContainer from '../components/PageContainer'

export default function Home() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [showAuthor, setShowAuthor] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [mode, setMode] = useState<'editor' | 'upload'>('editor')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [autoFormat, setAutoFormat] = useState(true)
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false)
  const [useCustomCredentials, setUseCustomCredentials] = useState(false)
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)
  const router = useRouter()
  const { data: session } = useSession()

  // Handle query parameters from AppLayout Sidebar
  useEffect(() => {
    if (router.query.targetFolderId) {
      setTargetFolderId(router.query.targetFolderId as string)
      // Clean URL
      const { targetFolderId, ...rest } = router.query
      router.replace({ pathname: '/', query: rest }, undefined, { shallow: true })
    }
    if (router.query.reset) {
      setTargetFolderId(null)
      setText('')
      setTitle('')
      // Clean URL
      const { reset, ...rest } = router.query
      router.replace({ pathname: '/', query: rest }, undefined, { shallow: true })
    }
  }, [router.query.targetFolderId, router.query.reset, router.replace])

  // Check if user has custom credentials
  useEffect(() => {
    if (session?.user) {
      fetch('/api/credentials')
        .then(res => res.json())
        .then(data => {
          setHasCustomCredentials(data.hasCredentials)
          setUseCustomCredentials(data.useCustomCredentials)
        })
        .catch(err => console.error('Failed to load credentials:', err))
    }
  }, [session])

  const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    await handleFileUpload(
      file,
      showAuthor,
      author,
      autoFormat,
      setText,
      setTitle,
      setMode,
      setIsConverting
    )
  }

  const onShare = async () => {
    await handleSave(text, title, showAuthor, author, isPublic, hashtags, router, targetFolderId)
  }

  return (
    <PageContainer maxWidth="800px">
      <Navbar
        onResetCreate={() => {
          setTargetFolderId(null)
          setText('')
          setTitle('')
        }}
      />

      {/* Storage Tier Notification Banner */}
      {!session?.user ? (
        <div
          style={{
            backgroundColor: 'var(--color-accent-light)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 'var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 6px -1px var(--color-shadow)'
          }}
        >
          <span style={{ fontSize: '24px' }}>🚀</span>
          <div style={{ flex: 1, fontFamily: 'var(--font-sans)' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--color-text)', lineHeight: 'var(--leading-relaxed)' }}>
              <strong>Guest Mode:</strong> Your shared documents are active for <strong>3 days</strong>.{' '}
              <Link
                href="/signup"
                style={{
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  fontWeight: 'var(--weight-bold)'
                }}
              >
                Sign up for free
              </Link>{' '}
              in 30 seconds to enjoy permanent storage!
            </p>
          </div>
        </div>
      ) : useCustomCredentials ? (
        <div
          style={{
            backgroundColor: 'var(--color-success-light)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: 'var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '20px' }}>✅</span>
          <div style={{ flex: 1, fontFamily: 'var(--font-sans)' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--color-text)' }}>
              <strong>Custom Storage:</strong> Saving files to your dedicated Neon and Cloudinary buckets.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            marginBottom: 'var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '20px' }}>💾</span>
          <div style={{ flex: 1, fontFamily: 'var(--font-sans)' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--color-text)' }}>
              <strong>Default Storage:</strong> Saving permanently to our shared cloud.{' '}
              <Link
                href="/settings"
                style={{
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  fontWeight: 'var(--weight-semibold)'
                }}
              >
                Add your own credentials
              </Link>{' '}
              for private database control.
            </p>
          </div>
        </div>
      )}

      <ModeSelector mode={mode} onModeChange={setMode} />

      {/* Upload Mode */}
      {mode === 'upload' && (
        <FileUpload
          uploadedFile={uploadedFile}
          isConverting={isConverting}
          showAuthor={showAuthor}
          author={author}
          autoFormat={autoFormat}
          onFileUpload={onFileUpload}
          onShowAuthorChange={setShowAuthor}
          onAuthorChange={setAuthor}
          onAutoFormatChange={setAutoFormat}
        />
      )}

      {/* Editor Mode */}
      {mode === 'editor' && (
        <MarkdownEditor
          text={text}
          title={title}
          author={author}
          showAuthor={showAuthor}
          isPublic={isPublic}
          hashtags={hashtags}
          onTextChange={setText}
          onTitleChange={setTitle}
          onAuthorChange={setAuthor}
          onShowAuthorChange={setShowAuthor}
          onIsPublicChange={setIsPublic}
          onHashtagsChange={setHashtags}
        />
      )}

      <FolderSelect activeFolderId={targetFolderId} onChange={setTargetFolderId} />
      <ShareButton text={text} onShare={onShare} />
    </PageContainer>
  )
}