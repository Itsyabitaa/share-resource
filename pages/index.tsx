import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false })
import 'easymde/dist/easymde.min.css'

export default function Home() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'editor' | 'upload'>('editor')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const router = useRouter()
  const { theme, toggleTheme, colors } = useTheme()

  // Stable onChange handler to prevent cursor issues
  const handleTextChange = useCallback((value: string) => {
    setText(value)
  }, [])

  // SimpleMDE configuration options
  const mdeOptions = {
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
    autofocus: true,
    autoDownloadFontAwesome: false,
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: true,
    },
    minHeight: '300px'
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setIsConverting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('Convert error:', data)
        alert(`Error converting file: ${data.error || 'Unknown error'}`)
        return
      }

      setText(data.content)
      setMode('editor')
      setIsConverting(false)
    } catch (err) {
      console.error('Conversion error:', err)
      alert('Error converting file')
      setIsConverting(false)
    }
  }

  const handleSave = async () => {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        console.error('Save error:', data)
        alert(`Error saving: ${data.error || data.details || 'Unknown error'}`)
        return
      }
      
      if (data.id) {
        router.push(`/file/${data.id}`)
      }
    } catch (err) {
      console.error('Network error:', err)
      alert('Network error occurred while saving')
    }
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
      {/* Header with theme toggle */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 30 
      }}>
        <h1 style={{ color: colors.text }}>Create & Share Markdown</h1>
        <button
          onClick={toggleTheme}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: colors.buttonBackground,
            color: colors.buttonText,
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
      
      {/* Mode Selection */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <button
          onClick={() => setMode('editor')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: mode === 'editor' ? colors.buttonBackground : colors.cardBackground,
            color: mode === 'editor' ? colors.buttonText : colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Text Editor
        </button>
        <button
          onClick={() => setMode('upload')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: mode === 'upload' ? colors.buttonBackground : colors.cardBackground,
            color: mode === 'upload' ? colors.buttonText : colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Upload File
        </button>
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div style={{ 
          marginBottom: 20, 
          padding: '30px', 
          border: `2px dashed ${colors.primary}`, 
          borderRadius: '10px',
          textAlign: 'center',
          backgroundColor: colors.cardBackground
        }}>
          <input
            type="file"
            accept=".txt,.doc,.docx,.md"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '20px', marginBottom: '10px', color: colors.primary }}>
              {isConverting ? '🔄 Converting...' : '📁 Click to upload a file'}
            </div>
            <div style={{ fontSize: '14px', color: colors.secondary, marginBottom: '15px' }}>
              Supported formats: TXT, DOC, DOCX, MD
            </div>
            <div style={{ 
              padding: '10px 20px', 
              backgroundColor: colors.buttonBackground, 
              color: colors.buttonText, 
              borderRadius: '5px',
              display: 'inline-block'
            }}>
              Choose File
            </div>
          </label>
          {uploadedFile && (
            <div style={{ marginTop: '15px', fontSize: '14px', color: colors.primary }}>
              ✅ Selected: {uploadedFile.name}
            </div>
          )}
        </div>
      )}

      {/* Editor Mode */}
      {mode === 'editor' && (
        <div style={{ marginBottom: 20 }}>
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
              key="markdown-editor"
              value={text} 
              onChange={handleTextChange} 
              options={mdeOptions}
            />
          </div>
        </div>
      )}

      {/* Share Button */}
      {text && (
        <button 
          onClick={handleSave} 
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            backgroundColor: colors.buttonBackground, 
            color: colors.buttonText, 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.buttonHover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.buttonBackground
          }}
        >
          Share
        </button>
      )}
    </div>
  )
}