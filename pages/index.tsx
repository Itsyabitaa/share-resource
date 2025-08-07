import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useRouter } from 'next/router'

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false })
import 'easymde/dist/easymde.min.css'

export default function Home() {
  const [text, setText] = useState('')
  const router = useRouter()

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
    status: ['lines', 'words', 'cursor'] as const
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>Create & Share Markdown</h1>
      <div style={{ marginBottom: 20 }}>
        <SimpleMDE 
          value={text} 
          onChange={setText} 
          options={mdeOptions}
        />
      </div>
      <button 
        onClick={handleSave} 
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px', 
          backgroundColor: '#0070f3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer' 
        }}
      >
        Share
      </button>
    </div>
  )
}