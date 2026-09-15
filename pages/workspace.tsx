import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'
import type { Folder } from '../components/Sidebar'
import { daysUntilExpiry } from '../lib/storagePolicy'

interface Doc {
  id: string
  title: string
  created_at: string
  folder_id: string | null
  is_public: boolean
  expires_at: string | null
}

type SortKey = 'newest' | 'oldest' | 'title'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function WorkspacePage() {
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()

  const [files, setFiles] = useState<Doc[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [movingId, setMovingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const activeFolderId =
    typeof router.query.folder === 'string' ? router.query.folder : null

  const activeFolder = folders.find((folder) => folder.id === activeFolderId) || null

  useEffect(() => {
    if (router.query.focusSearch === '1') {
      searchInputRef.current?.focus()
      const { focusSearch: _, ...rest } = router.query
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
    }
  }, [router.query.focusSearch])

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`${sitePath('/login')}?redirect=${encodeURIComponent('/workspace')}`)
    }
  }, [session, isPending, router, sitePath])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [filesRes, foldersRes] = await Promise.all([
        fetch(apiPath('/user/files')),
        fetch(apiPath('/folders')),
      ])

      if (filesRes.ok) {
        const data = await filesRes.json()
        setFiles(data.files || [])
      }

      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders || [])
      }
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    if (session?.user) loadData()
  }, [session, loadData])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: files.length, unassigned: 0 }
    for (const file of files) {
      if (!file.folder_id) counts.unassigned += 1
      else counts[file.folder_id] = (counts[file.folder_id] || 0) + 1
    }
    return counts
  }, [files])

  const visibleFiles = useMemo(() => {
    let list = files

    if (activeFolderId === 'unassigned') {
      list = list.filter((file) => !file.folder_id)
    } else if (activeFolderId) {
      list = list.filter((file) => file.folder_id === activeFolderId)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((file) => file.title.toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'oldest') return a.created_at.localeCompare(b.created_at)
      return b.created_at.localeCompare(a.created_at)
    })
  }, [files, activeFolderId, search, sort])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document permanently?')) return
    const res = await fetch(apiPath(`/files/${id}`), { method: 'DELETE' })
    if (res.ok) {
      setFiles((current) => current.filter((file) => file.id !== id))
      setToast('Document deleted')
    }
  }

  const handleMove = async (id: string, folderId: string | null) => {
    const res = await fetch(apiPath(`/files/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    })
    if (res.ok) {
      setMovingId(null)
      loadData()
      setToast('Document moved')
    }
  }

  const handleCreateFolder = async () => {
    const name = window.prompt('New folder name')
    if (!name?.trim()) return

    const res = await fetch(apiPath('/folders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })

    if (res.ok) {
      const data = await res.json()
      await loadData()
      router.push(`${sitePath('/workspace')}?folder=${encodeURIComponent(data.folder.id)}`)
      setToast('Folder created')
    }
  }

  const handleRenameFolder = async () => {
    if (!activeFolder) return
    const name = window.prompt('Rename folder', activeFolder.name)
    if (!name?.trim() || name.trim() === activeFolder.name) return

    const res = await fetch(apiPath(`/folders/${activeFolder.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })

    if (res.ok) {
      loadData()
      setToast('Folder renamed')
    }
  }

  const handleDeleteFolder = async () => {
    if (!activeFolder) return
    if (!confirm(`Delete folder "${activeFolder.name}"? Documents inside will move to All files.`)) return

    const res = await fetch(apiPath(`/folders/${activeFolder.id}`), { method: 'DELETE' })
    if (res.ok) {
      router.push(sitePath('/workspace'))
      loadData()
      setToast('Folder deleted')
    }
  }

  if (!session) return null

  const breadcrumbLabel = activeFolderId === 'unassigned'
    ? 'Unassigned'
    : activeFolder?.name || 'All documents'

  return (
    <div className="page-shell wide workspace-page" style={{ color: colors.text }}>
      {toast && (
        <div className="workspace-toast" onAnimationEnd={() => setToast(null)}>
          {toast}
        </div>
      )}

      <header className="workspace-header">
        <div>
          <p className="composer-kicker">Workspace</p>
          <h1 className="page-title">{breadcrumbLabel}</h1>
          <p className="page-subtitle">
            {visibleFiles.length} document{visibleFiles.length === 1 ? '' : 's'}
            {activeFolderId ? '' : ' · use folders to organize your nest'}
          </p>
        </div>
        <div className="workspace-header-actions">
          <Link href={sitePath('/')} className="header-btn primary">
            New document
          </Link>
          <button type="button" className="header-btn" onClick={handleCreateFolder}>
            New folder
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="workspace-folders-panel" style={{ borderColor: colors.border, background: colors.cardBackground }}>
          <button
            type="button"
            className={`workspace-folder-link${!activeFolderId ? ' is-active' : ''}`}
            onClick={() => router.push(sitePath('/workspace'))}
          >
            <span>All documents</span>
            <span className="workspace-count">{folderCounts.all}</span>
          </button>
          <button
            type="button"
            className={`workspace-folder-link${activeFolderId === 'unassigned' ? ' is-active' : ''}`}
            onClick={() => router.push(`${sitePath('/workspace')}?folder=unassigned`)}
          >
            <span>Unassigned</span>
            <span className="workspace-count">{folderCounts.unassigned}</span>
          </button>

          <div className="workspace-folder-divider">Folders</div>

          {folders.length === 0 ? (
            <p className="workspace-empty-hint">No folders yet. Create one to organize documents.</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`workspace-folder-link${activeFolderId === folder.id ? ' is-active' : ''}`}
                onClick={() => router.push(`${sitePath('/workspace')}?folder=${encodeURIComponent(folder.id)}`)}
              >
                <span>{folder.name}</span>
                <span className="workspace-count">{folderCounts[folder.id] || 0}</span>
              </button>
            ))
          )}
        </aside>

        <section className="workspace-main">
          <div className="workspace-toolbar">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="workspace-search"
              style={{
                borderColor: colors.border,
                background: colors.inputBackground,
                color: colors.text,
              }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="workspace-sort"
              style={{
                borderColor: colors.border,
                background: colors.inputBackground,
                color: colors.text,
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>

          {activeFolder && (
            <div className="workspace-folder-actions">
              <button type="button" className="header-btn" onClick={handleRenameFolder}>
                Rename folder
              </button>
              <button type="button" className="header-btn" onClick={handleDeleteFolder}>
                Delete folder
              </button>
              <Link
                href={`${sitePath('/')}?targetFolderId=${encodeURIComponent(activeFolder.id)}`}
                className="header-btn"
              >
                Create here
              </Link>
            </div>
          )}

          {loading ? (
            <p className="workspace-empty-hint">Loading your documents...</p>
          ) : visibleFiles.length === 0 ? (
            <div className="workspace-empty" style={{ borderColor: colors.border, background: colors.cardBackground }}>
              <h2>No documents here</h2>
              <p>
                {search.trim()
                  ? 'No matches for your search.'
                  : 'Start writing, or upload a file from the Create page.'}
              </p>
              <Link href={sitePath('/')} className="header-btn primary">
                Go to Create
              </Link>
            </div>
          ) : (
            <div className="workspace-doc-grid">
              {visibleFiles.map((file) => {
                const daysLeft = daysUntilExpiry(file.expires_at)
                return (
                  <article
                    key={file.id}
                    className="workspace-doc-card"
                    style={{ borderColor: colors.border, background: colors.cardBackground }}
                  >
                    <Link href={sitePath(`/file/${file.id}`)} className="workspace-doc-title">
                      {file.title || 'Untitled'}
                    </Link>
                    <div className="workspace-doc-meta">
                      <span className={`workspace-pill${file.is_public ? ' public' : ''}`}>
                        {file.is_public ? 'Public' : 'Private'}
                      </span>
                      <span className="workspace-pill">
                        {file.expires_at
                          ? daysLeft !== null && daysLeft <= 7
                            ? `${daysLeft}d left`
                            : `Expires ${formatDate(file.expires_at)}`
                          : 'Permanent'}
                      </span>
                      <span className="workspace-pill muted">{formatDate(file.created_at)}</span>
                    </div>
                    <div className="workspace-doc-actions">
                      <button
                        type="button"
                        className="header-btn"
                        onClick={() => router.push(sitePath(`/edit/${file.id}`))}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="header-btn"
                        onClick={() => setMovingId(movingId === file.id ? null : file.id)}
                      >
                        Move
                      </button>
                      <button type="button" className="header-btn" onClick={() => handleDelete(file.id)}>
                        Delete
                      </button>
                    </div>
                    {movingId === file.id && (
                      <div className="workspace-move-row">
                        <select
                          defaultValue={file.folder_id || ''}
                          onChange={(e) => handleMove(file.id, e.target.value || null)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: `1px solid ${colors.border}`,
                            background: colors.inputBackground,
                            color: colors.text,
                          }}
                        >
                          <option value="">Unassigned</option>
                          {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
