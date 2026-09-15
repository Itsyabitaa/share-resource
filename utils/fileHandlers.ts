export const handleFileUpload = async (
  file: File,
  showAuthor: boolean,
  author: string,
  autoFormat: boolean,
  setText: (text: string) => void,
  setMode: (mode: 'editor' | 'upload') => void,
  setIsConverting: (converting: boolean) => void,
  paths?: {
    apiPath?: (path: string) => string
  }
) => {
  setIsConverting(true)
  const apiPath = paths?.apiPath ?? ((path: string) => path)

  try {
    const formData = new FormData()
    formData.append('file', file)
    // Include author information if available
    if (showAuthor && author) {
      formData.append('author', author)
    }
    // Include auto-format preference
    formData.append('autoFormat', String(autoFormat))

    const res = await fetch(apiPath('/convert'), {
      method: 'POST',
      body: formData,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('Convert error:', data)
      alert(data.error || 'Could not convert this file.')
      return
    }

    if (!data.content) {
      alert('Could not convert this file.')
      return
    }

    setText(data.content)
    setMode('editor')
    return data.title as string | undefined
  } catch (err) {
    console.error('Conversion error:', err)
    alert('Could not convert this file. Check the file type and try again.')
  } finally {
    setIsConverting(false)
  }
}

export const handleSave = async (
  text: string,
  title: string,
  showAuthor: boolean,
  author: string,
  isPublic: boolean,
  hashtags: string[],
  router: any,
  folderId?: string | null,
  paths?: {
    sitePath?: (path: string) => string
    apiPath?: (path: string) => string
  },
  isAuthenticated?: boolean
) => {
  const sitePath = paths?.sitePath ?? ((path: string) => path)
  const apiPath = paths?.apiPath ?? ((path: string) => path)

  if (!isAuthenticated && typeof window !== 'undefined') {
    const ok = window.confirm('Guest links expire in 3 days. Continue? Sign up to keep documents permanently.')
    if (!ok) return
  }

  try {
    const res = await fetch(apiPath('/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        title: title || 'Untitled Document',
        author: showAuthor ? author : undefined,
        isPublic,
        hashtags,
        folderId
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Save error:', data)
      alert(`Error saving: ${data.error || data.details || 'Unknown error'}`)
      return
    }

    if (data.id) {
      router.push(sitePath(`/file/${data.id}`))
    }
  } catch (err) {
    console.error('Network error:', err)
    alert('Network error occurred while saving')
  }
}
