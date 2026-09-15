import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'
import FolderSelect from '../components/FolderSelect'

interface Doc {
  id: string
  title: string
  created_at: string
  folder_id: string | null
  is_public: boolean
  expires_at: string | null
}

export default function WorkspacePage() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()
  const [files, setFiles] = useState<Doc[]>([])
  const [search, setSearch] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`${sitePath('/login')}?redirect=${encodeURIComponent('/workspace')}`)
    }
  }, [session, isPending, router, sitePath])

  const loadFiles = async () => {
    const res = await fetch(apiPath('/user/files'))
    if (res.ok) {
      const data = await res.json()
      setFiles(data.files || [])
    }
  }

  useEffect(() => {
    if (session?.user) loadFiles()
  }, [session])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document permanently?')) return
    const res = await fetch(apiPath(`/files/${id}`), { method: 'DELETE' })
    if (res.ok) setFiles(files.filter(file => file.id !== id))
  }

  const handleMove = async (id: string, folderId: string | null) => {
    await fetch(apiPath(`/files/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    })
    setMovingId(null)
    loadFiles()
  }

  const filtered = files.filter(file =>
    file.title.toLowerCase().includes(search.toLowerCase())
  )

  if (!session) return null

  return (
    <div className="page-shell wide" style={{ color: colors.text }}>
      <h1 className="page-title">My documents</h1>
      <p className="page-subtitle">Search, open, move, or delete your nest.</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search your documents..."
        style={{
          width: '100%',
          marginBottom: 20,
          padding: '12px 14px',
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: colors.inputBackground,
          color: colors.text,
          fontSize: 16,
        }}
      />

      {filtered.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No documents yet. Create one from the home page.</p>
      ) : (
        <div className="explore-grid">
          {filtered.map(file => (
            <div
              key={file.id}
              style={{
                padding: 16,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                background: colors.cardBackground,
              }}
            >
              <a href={sitePath(`/file/${file.id}`)} style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                {file.title || 'Untitled'}
              </a>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
                {file.is_public ? 'Public' : 'Private'}
                {file.expires_at ? ` · expires ${new Date(file.expires_at).toLocaleDateString()}` : ' · kept'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="header-btn" type="button" onClick={() => router.push(sitePath(`/edit/${file.id}`))}>
                  Edit
                </button>
                <button className="header-btn" type="button" onClick={() => setMovingId(movingId === file.id ? null : file.id)}>
                  Move
                </button>
                <button className="header-btn" type="button" onClick={() => handleDelete(file.id)}>
                  Delete
                </button>
              </div>
              {movingId === file.id && (
                <div style={{ marginTop: 12 }}>
                  <FolderSelect
                    activeFolderId={file.folder_id}
                    onChange={(folderId) => handleMove(file.id, folderId)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
