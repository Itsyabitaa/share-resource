import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleFileUpload, handleSave } from '../../utils/fileHandlers'

describe('File Handlers Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.alert = vi.fn()
  })

  it('handleFileUpload calls conversion API and sets text/title on success', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const setText = vi.fn()
    const setTitle = vi.fn()
    const setMode = vi.fn()
    const setIsConverting = vi.fn()

    const mockResponse = {
      ok: true,
      json: async () => ({ content: 'converted-content', title: 'test.txt' })
    }
    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await handleFileUpload(
      file,
      true,
      'Author Name',
      true,
      setText,
      setTitle,
      setMode,
      setIsConverting
    )

    expect(global.fetch).toHaveBeenCalledWith('/api/convert', expect.any(Object))
    expect(setText).toHaveBeenCalledWith('converted-content')
    expect(setTitle).toHaveBeenCalledWith('test.txt')
    expect(setMode).toHaveBeenCalledWith('editor')
    expect(setIsConverting).toHaveBeenLastCalledWith(false)
  })

  it('handleFileUpload handles API errors gracefully', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const setText = vi.fn()
    const setTitle = vi.fn()
    const setMode = vi.fn()
    const setIsConverting = vi.fn()

    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Fail conversion' })
    }
    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await handleFileUpload(
      file,
      false,
      '',
      false,
      setText,
      setTitle,
      setMode,
      setIsConverting
    )

    expect(global.alert).toHaveBeenCalledWith('Error converting file: Fail conversion')
    expect(setText).not.toHaveBeenCalled()
    expect(setIsConverting).toHaveBeenLastCalledWith(false)
  })

  it('handleSave calls save API and redirects on success', async () => {
    const router = { push: vi.fn() }
    const mockResponse = {
      ok: true,
      json: async () => ({ id: 'new-file-id' })
    }
    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await handleSave(
      'Markdown text',
      'My Doc',
      true,
      'Author Name',
      true,
      ['test'],
      router,
      'folder-123'
    )

    expect(global.fetch).toHaveBeenCalledWith('/api/save', expect.any(Object))
    expect(router.push).toHaveBeenCalledWith('/file/new-file-id')
  })

  it('handleSave alerts error on save failure', async () => {
    const router = { push: vi.fn() }
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Validation failed' })
    }
    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await handleSave(
      'Markdown text',
      'My Doc',
      false,
      '',
      false,
      [],
      router,
      null
    )

    expect(global.alert).toHaveBeenCalledWith('Error saving: Validation failed')
    expect(router.push).not.toHaveBeenCalled()
  })
})
