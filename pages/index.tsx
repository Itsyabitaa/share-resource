import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'
import { useSession } from '../lib/auth-client'
import { handleFileUpload, handleSave } from '../utils/fileHandlers'
import Link from 'next/link'
import ModeSelector from '../components/ModeSelector'
import FileUpload from '../components/FileUpload'
import MarkdownEditor from '../components/MarkdownEditor'
import ShareButton from '../components/ShareButton'
import FolderSelect from '../components/FolderSelect'
import { useAppPaths } from '../lib/appPaths'
import { canUsePhotoToMarkdown } from '../lib/plans'
import { isImageFile } from '../utils/imageToMarkdown'

const buildQueryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, String(item)))
      return
    }

    params.set(key, String(value))
  })

  return params.toString()
}

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
  const [conversionStatus, setConversionStatus] = useState('')
  const [autoFormat, setAutoFormat] = useState(true) // Default to auto-format enabled
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false)
  const [useCustomCredentials, setUseCustomCredentials] = useState(false)
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null)
  const router = useRouter()
  const { colors } = useTheme()
  const { data: session } = useSession()
  const { apiPath, sitePath } = useAppPaths()

  // Handle query parameters from AppLayout Sidebar
  useEffect(() => {
    if (router.query.targetFolderId) {
      setTargetFolderId(router.query.targetFolderId as string)
      // Clean URL
      const { targetFolderId, ...rest } = router.query
      const queryString = buildQueryString(rest)
      router.replace(queryString ? `${sitePath('/')}?${queryString}` : sitePath('/'), undefined, { shallow: true })
    }
    if (router.query.reset) {
      setTargetFolderId(null)
      setText('')
      setTitle('')
      // Clean URL
      const { reset, ...rest } = router.query
      const queryString = buildQueryString(rest)
      router.replace(queryString ? `${sitePath('/')}?${queryString}` : sitePath('/'), undefined, { shallow: true })
    }
  }, [router.query.targetFolderId, router.query.reset, router.replace, sitePath])

  // Check if user has custom credentials
  useEffect(() => {
    if (session?.user) {
      fetch(apiPath('/credentials'))
        .then(res => res.json())
        .then(data => {
          setHasCustomCredentials(data.hasCredentials)
          setUseCustomCredentials(data.useCustomCredentials)
        })
        .catch(err => console.error('Failed to load credentials:', err))
    }
  }, [session, apiPath])

  useEffect(() => {
    if (!session?.user) {
      setUserPlan(null)
      return
    }

    fetch(apiPath('/plan'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.plan === 'pro' || data?.plan === 'free') setUserPlan(data.plan)
      })
      .catch(() => {})
  }, [session?.user, apiPath])

  const photoToMarkdownEnabled = canUsePhotoToMarkdown({
    isSignedIn: !!session?.user,
    plan: userPlan,
  })

  const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (isImageFile(file) && !photoToMarkdownEnabled) {
      alert(
        session?.user
          ? 'Photo and camera to markdown is a Pro feature. Upgrade on the Pricing page.'
          : 'Sign in with a Pro account to convert photos and camera shots to markdown.'
      )
      event.target.value = ''
      return
    }

    setUploadedFile(file)
    setConversionStatus('')
    const suggestedTitle = await handleFileUpload(
      file,
      showAuthor,
      author,
      autoFormat,
      setText,
      setMode,
      setIsConverting,
      { apiPath },
      setConversionStatus,
      { allowPhotoToMarkdown: photoToMarkdownEnabled }
    )
    setConversionStatus('')
    if (suggestedTitle && !title) {
      setTitle(suggestedTitle)
    }
    event.target.value = ''
  }

  const onShare = async () => {
    await handleSave(text, title, showAuthor, author, isPublic, hashtags, router, targetFolderId, {
      sitePath,
      apiPath,
    }, !!session?.user)
  }

  return (
    <div className="page-shell composer" style={{ color: colors.text }}>
      <header className="composer-hero">
        <p className="composer-kicker">Create</p>
        <h1 className="page-title">Start a nest</h1>
        <p className="page-subtitle">
          Write in markdown, or drop in a Word or PDF. Share a quiet link when it feels ready.
        </p>
      </header>

      {!session?.user ? (
        <div className="composer-note warn">
          Guest nests last 3 days.{' '}
          <Link href={sitePath('/signup')}>Create a free account</Link>
          {' '}for 30-day storage, or{' '}
          <Link href={sitePath('/pricing')}>see Pro</Link>
          {' '}for permanent storage.
        </div>
      ) : userPlan === 'free' ? (
        <div className="composer-note warn">
          Free accounts keep documents for 30 days.{' '}
          <Link href={sitePath('/pricing')}>Upgrade to Pro</Link>
          {' '}for permanent storage.
        </div>
      ) : userPlan === 'pro' ? (
        <div className="composer-note ok">
          Pro account — your documents are stored permanently.
        </div>
      ) : useCustomCredentials ? (
        <div className="composer-note ok">
          Saving to your own Cloudinary storage.
        </div>
      ) : hasCustomCredentials ? (
        <div className="composer-note">
          Using shared storage.{' '}
          <Link href={sitePath('/settings')}>Use your own Cloudinary</Link>
        </div>
      ) : null}

      <section className="composer-stage">
        <div className="composer-stage-bar">
          <ModeSelector mode={mode} onModeChange={setMode} />
        </div>

        {mode === 'upload' ? (
          <FileUpload
            uploadedFile={uploadedFile}
            isConverting={isConverting}
            conversionStatus={conversionStatus}
            photoToMarkdownEnabled={photoToMarkdownEnabled}
            showAuthor={showAuthor}
            author={author}
            autoFormat={autoFormat}
            onFileUpload={onFileUpload}
            onShowAuthorChange={setShowAuthor}
            onAuthorChange={setAuthor}
            onAutoFormatChange={setAutoFormat}
          />
        ) : (
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

        <div className="composer-stage-footer">
          <FolderSelect activeFolderId={targetFolderId} onChange={setTargetFolderId} />
          <ShareButton text={text} onShare={onShare} />
        </div>
      </section>
    </div>
  )
}