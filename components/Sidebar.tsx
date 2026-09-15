import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useAppPaths } from '../lib/appPaths'

export interface Folder {
  id: string
  name: string
  created_at: string
}

interface SidebarProps {
  isOpen?: boolean
  activeFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onCreateFileInFolder?: (folderId: string) => void
}

export default function Sidebar({
  isOpen = false,
  activeFolderId,
  onSelectFolder,
  onCreateFileInFolder,
}: SidebarProps) {
  const { data: session } = useSession()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({ all: 0, unassigned: 0 })
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const isWorkspace = router.pathname === '/workspace'

  const loadData = async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        fetch(apiPath('/folders')),
        fetch(apiPath('/user/files')),
      ])

      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders || [])
      }

      if (filesRes.ok) {
        const data = await filesRes.json()
        const files = data.files || []
        const counts: Record<string, number> = { all: files.length, unassigned: 0 }
        for (const file of files) {
          if (!file.folder_id) counts.unassigned += 1
          else counts[file.folder_id] = (counts[file.folder_id] || 0) + 1
        }
        setFileCounts(counts)
      }
    } catch (error) {
      console.error('Failed to load sidebar data:', error)
    }
  }

  useEffect(() => {
    if (session?.user) loadData()
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user && isWorkspace) loadData()
  }, [router.asPath, session?.user?.id, isWorkspace])

  const activeKey = useMemo(() => {
    if (!isWorkspace) return activeFolderId
    if (typeof router.query.folder === 'string') return router.query.folder
    return null
  }, [isWorkspace, activeFolderId, router.query.folder])

  const goWorkspace = (folderId: string | null) => {
    onSelectFolder(folderId)
    if (folderId === null) {
      router.push(sitePath('/workspace'))
      return
    }
    if (folderId === 'unassigned') {
      router.push(`${sitePath('/workspace')}?folder=unassigned`)
      return
    }
    router.push(`${sitePath('/workspace')}?folder=${encodeURIComponent(folderId)}`)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const res = await fetch(apiPath('/folders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setNewFolderName('')
        setIsCreating(false)
        await loadData()
        goWorkspace(data.folder.id)
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const folder = folders.find((item) => item.id === folderId)
    if (!folder) return
    if (!confirm(`Delete "${folder.name}"? Documents inside will stay in your workspace.`)) return

    try {
      const res = await fetch(apiPath(`/folders/${folderId}`), { method: 'DELETE' })
      if (res.ok) {
        if (activeKey === folderId) goWorkspace(null)
        await loadData()
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const startRename = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingId(folder.id)
    setRenameValue(folder.name)
  }

  const commitRename = async (folderId: string) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name) return

    try {
      const res = await fetch(apiPath(`/folders/${folderId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) await loadData()
    } catch (error) {
      console.error('Failed to rename folder:', error)
    }
  }

  if (!session?.user) return null

  return (
    <aside className={`workspace-sidebar${isOpen ? ' is-open' : ''}`}>
      <div className="sidebar-section">
        <p className="sidebar-label">Workspace</p>
        <button
          type="button"
          className={`sidebar-nav-item${activeKey === null && isWorkspace ? ' is-active' : ''}`}
          onClick={() => goWorkspace(null)}
        >
          <span>All documents</span>
          <span className="sidebar-count">{fileCounts.all}</span>
        </button>
        <button
          type="button"
          className={`sidebar-nav-item${activeKey === 'unassigned' ? ' is-active' : ''}`}
          onClick={() => goWorkspace('unassigned')}
        >
          <span>Unassigned</span>
          <span className="sidebar-count">{fileCounts.unassigned}</span>
        </button>
        <button
          type="button"
          className="sidebar-nav-item accent"
          onClick={() => router.push(sitePath('/workspace'))}
        >
          Open workspace
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-head">
          <p className="sidebar-label">Folders</p>
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={() => setIsCreating((open) => !open)}
            title="New folder"
            aria-label="New folder"
          >
            +
          </button>
        </div>

        {isCreating && (
          <div className="sidebar-create">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewFolderName('')
                }
              }}
              placeholder="Folder name"
              autoFocus
            />
            <button type="button" className="header-btn primary" onClick={handleCreateFolder}>
              Add
            </button>
          </div>
        )}

        <div className="sidebar-folder-list">
          {folders.length === 0 ? (
            <p className="sidebar-empty">No folders yet</p>
          ) : (
            folders.map((folder) => (
              <div key={folder.id} className="sidebar-folder-row">
                {renamingId === folder.id ? (
                  <input
                    className="sidebar-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(folder.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => commitRename(folder.id)}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className={`sidebar-nav-item${activeKey === folder.id ? ' is-active' : ''}`}
                    onClick={() => goWorkspace(folder.id)}
                  >
                    <span>{folder.name}</span>
                    <span className="sidebar-count">{fileCounts[folder.id] || 0}</span>
                  </button>
                )}

                {activeKey === folder.id && renamingId !== folder.id && (
                  <div className="sidebar-folder-tools">
                    {onCreateFileInFolder && (
                      <button
                        type="button"
                        className="sidebar-icon-btn"
                        title="Create document in folder"
                        onClick={() => onCreateFileInFolder(folder.id)}
                      >
                        +
                      </button>
                    )}
                    <button
                      type="button"
                      className="sidebar-icon-btn"
                      title="Rename folder"
                      onClick={(e) => startRename(folder, e)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="sidebar-icon-btn danger"
                      title="Delete folder"
                      onClick={(e) => handleDeleteFolder(folder.id, e)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
