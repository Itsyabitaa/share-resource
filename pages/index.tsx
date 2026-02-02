import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'
import { useSession } from '../lib/auth-client'
import Header from '../components/Header'
import ModeSelector from '../components/ModeSelector'
import FileUpload from '../components/FileUpload'
import MarkdownEditor from '../components/MarkdownEditor'
import ShareButton from '../components/ShareButton'
import { handleFileUpload, handleSave } from '../utils/fileHandlers'
import Link from 'next/link'

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
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false)
  const [useCustomCredentials, setUseCustomCredentials] = useState(false)
  const router = useRouter()
  const { colors, theme } = useTheme()
  const { data: session } = useSession()

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
      setText,
      setMode,
      setIsConverting
    )
  }

  const onShare = async () => {
    await handleSave(text, title, showAuthor, author, isPublic, hashtags, router)
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
      <Header />

      {/* Storage Tier Notification */}
      {!session?.user ? (
        <div style={{
          backgroundColor: theme === 'dark' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.1)',
          border: `1px solid ${theme === 'dark' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.4)'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>⏰</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', color: colors.text }}>
              <strong>Guest Mode:</strong> Your uploads will be available for <strong>3 days</strong>.{' '}
              <Link href="/signup" style={{
                color: theme === 'dark' ? '#fbbf24' : '#d97706',
                textDecoration: 'underline',
                fontWeight: '600'
              }}>
                Sign up
              </Link> for permanent storage!
            </p>
          </div>
        </div>
      ) : useCustomCredentials ? (
        <div style={{
          backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          border: `1px solid ${theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.4)'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', color: colors.text }}>
              <strong>Custom Storage:</strong> Using your personal Neon and Cloudinary credentials.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>💾</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', color: colors.text }}>
              <strong>Default Storage:</strong> Using shared storage (permanent).{' '}
              <Link href="/settings" style={{
                color: theme === 'dark' ? '#60a5fa' : '#2563eb',
                textDecoration: 'underline',
                fontWeight: '600'
              }}>
                Add your own credentials
              </Link> for dedicated storage.
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
          onFileUpload={onFileUpload}
          onShowAuthorChange={setShowAuthor}
          onAuthorChange={setAuthor}
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

      <ShareButton text={text} onShare={onShare} />
    </div>
  )
}