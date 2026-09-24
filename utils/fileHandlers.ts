import { apiFetch } from '../lib/apiFetch'
import { alertMessage, confirmAction } from '../lib/swal'
import { convertImageToMarkdown, isImageFile } from './imageToMarkdown'

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
  },
  onProgress?: (message: string) => void,
  options?: {
    allowPhotoToMarkdown?: boolean
  }
) => {
  setIsConverting(true)
  const apiPath = paths?.apiPath ?? ((path: string) => path)

  try {
    if (isImageFile(file)) {
      if (!options?.allowPhotoToMarkdown) {
        await alertMessage({
          title: 'Photo limit',
          text: 'Photo conversion limit reached or not available on your plan. See Pricing to upgrade.',
          icon: 'warning',
        })
        return
      }

      const result = await convertImageToMarkdown(file, autoFormat, apiPath, onProgress)
      setText(result.content)
      setMode('editor')
      return result.title
    }

    onProgress?.('Converting document…')
    const formData = new FormData()
    formData.append('file', file)
    // Include author information if available
    if (showAuthor && author) {
      formData.append('author', author)
    }
    // Include auto-format preference
    formData.append('autoFormat', String(autoFormat))

    const res = await apiFetch(apiPath('/convert'), {
      method: 'POST',
      body: formData,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('Convert error:', data)
      await alertMessage({ text: data.error || 'Could not convert this file.', icon: 'error' })
      return
    }

    if (!data.content) {
      await alertMessage({ text: 'Could not convert this file.', icon: 'error' })
      return
    }

    setText(data.content)
    setMode('editor')
    return data.title as string | undefined
  } catch (err) {
    console.error('Conversion error:', err)
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Could not convert this file. Check the file type and try again.'
    await alertMessage({ text: message, icon: 'error' })
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
  isAuthenticated?: boolean,
  listOnExplore: boolean = false
) => {
  const sitePath = paths?.sitePath ?? ((path: string) => path)
  const apiPath = paths?.apiPath ?? ((path: string) => path)

  if (!isAuthenticated && typeof window !== 'undefined') {
    const ok = await confirmAction({
      title: 'Guest document',
      text: 'Guest links expire in 3 days. Continue? Sign up for 30-day storage or upgrade to Pro for permanent storage.',
      confirmText: 'Continue',
      icon: 'info',
    })
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
        listOnExplore,
        hashtags,
        folderId
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Save error:', data)
      await alertMessage({
        text: `Error saving: ${data.error || data.details || 'Unknown error'}`,
        icon: 'error',
      })
      return
    }

    if (data.id) {
      router.push(sitePath(`/file/${data.id}`))
    }
  } catch (err) {
    console.error('Network error:', err)
    await alertMessage({ text: 'Network error occurred while saving', icon: 'error' })
  }
}
