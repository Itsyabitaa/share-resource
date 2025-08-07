import { useState } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'
import Header from '../components/Header'
import ModeSelector from '../components/ModeSelector'
import FileUpload from '../components/FileUpload'
import MarkdownEditor from '../components/MarkdownEditor'
import ShareButton from '../components/ShareButton'
import { handleFileUpload, handleSave } from '../utils/fileHandlers'

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
  const router = useRouter()
  const { colors } = useTheme()

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