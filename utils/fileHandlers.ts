export const handleFileUpload = async (
  file: File,
  showAuthor: boolean,
  author: string,
  setText: (text: string) => void,
  setMode: (mode: 'editor' | 'upload') => void,
  setIsConverting: (converting: boolean) => void
) => {
  setIsConverting(true)

  try {
    const formData = new FormData()
    formData.append('file', file)
    // Include author information if available
    if (showAuthor && author) {
      formData.append('author', author)
    }

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

export const handleSave = async (
  text: string,
  title: string,
  showAuthor: boolean,
  author: string,
  router: any
) => {
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: text,
        title: title || 'Untitled Document',
        author: showAuthor ? author : undefined
      }),
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
