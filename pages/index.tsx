import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useRouter } from 'next/router'

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false })
import 'easymde/dist/easymde.min.css'

export default function Home() {
  const [text, setText] = useState('')
  const router = useRouter()

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
      <SimpleMDE value={text} onChange={setText} />
      <button onClick={handleSave} style={{ marginTop: 10 }}>Share</button>
    </div>
  )
}