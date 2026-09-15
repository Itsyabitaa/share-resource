import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useSession } from '../lib/auth-client'
import { useAppPaths } from '../lib/appPaths'
import { useSidebar } from '../lib/SidebarContext'

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

function IconFolder({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconEdit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4.24-4.24L4 15.76V20z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDocs({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M16 4v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconInbox({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M4 10h5l2 3h2l2-3h5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export default function Sidebar({
  isOpen = false,
  activeFolderId,
  onSelectFolder,
  onCreateFileInFolder,
}: SidebarProps) {
  const { data: session } = useSession()
  const { apiPath, sitePath } = useAppPaths()
  const { closeSidebar } = useSidebar()
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

  const afterNavigate = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      closeSidebar()
    }
  }

  const goWorkspace = (folderId: string | null) => {
    onSelectFolder(folderId)
    if (folderId === null) {
      router.push(sitePath('/workspace'))
    } else if (folderId === 'unassigned') {
      router.push(`${sitePath('/workspace')}?folder=unassigned`)
    } else {
      router.push(`${sitePath('/workspace')}?folder=${encodeURIComponent(folderId)}`)
    }
    afterNavigate()
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
          <span className="sidebar-nav-leading">
            <IconDocs />
            <span>All documents</span>
          </span>
          <span className="sidebar-count">{fileCounts.all}</span>
        </button>
        <button
          type="button"
          className={`sidebar-nav-item${activeKey === 'unassigned' ? ' is-active' : ''}`}
          onClick={() => goWorkspace('unassigned')}
        >
          <span className="sidebar-nav-leading">
            <IconInbox />
            <span>Unassigned</span>
          </span>
          <span className="sidebar-count">{fileCounts.unassigned}</span>
        </button>
        {isWorkspace ? (
          <Link
            href={sitePath('/')}
            className="sidebar-nav-item accent"
            onClick={afterNavigate}
          >
            <span className="sidebar-nav-leading">
              <IconPlus size={16} />
              <span>New document</span>
            </span>
          </Link>
        ) : (
          <button
            type="button"
            className="sidebar-nav-item accent"
            onClick={() => {
              router.push(sitePath('/workspace'))
              afterNavigate()
            }}
          >
            <span className="sidebar-nav-leading">
              <IconFolder />
              <span>Open workspace</span>
            </span>
          </button>
        )}
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
            aria-expanded={isCreating}
          >
            <IconPlus />
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
            <button type="button" className="sidebar-create-btn" onClick={handleCreateFolder}>
              Add
            </button>
          </div>
        )}

        <div className="sidebar-folder-list">
          {folders.length === 0 ? (
            <p className="sidebar-empty">No folders yet — tap + to create one</p>
          ) : (
            folders.map((folder) => {
              const isActive = activeKey === folder.id
              const isRenaming = renamingId === folder.id

              if (isRenaming) {
                return (
                  <div key={folder.id} className="sidebar-folder-item is-renaming">
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
                  </div>
                )
              }

              return (
                <div
                  key={folder.id}
                  className={`sidebar-folder-item${isActive ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="sidebar-folder-main"
                    onClick={() => goWorkspace(folder.id)}
                  >
                    <span className="sidebar-folder-leading">
                      <IconFolder />
                      <span className="sidebar-folder-name">{folder.name}</span>
                    </span>
                    <span className="sidebar-count sidebar-folder-count">
                      {fileCounts[folder.id] || 0}
                    </span>
                  </button>
                  <div className="sidebar-folder-actions">
                    {onCreateFileInFolder && (
                      <button
                        type="button"
                        className="sidebar-icon-btn"
                        title="Create document in folder"
                        aria-label={`Create document in ${folder.name}`}
                        onClick={() => {
                          onCreateFileInFolder(folder.id)
                          afterNavigate()
                        }}
                      >
                        <IconPlus />
                      </button>
                    )}
                    <button
                      type="button"
                      className="sidebar-icon-btn"
                      title="Rename folder"
                      aria-label={`Rename ${folder.name}`}
                      onClick={(e) => startRename(folder, e)}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="sidebar-icon-btn danger"
                      title="Delete folder"
                      aria-label={`Delete ${folder.name}`}
                      onClick={(e) => handleDeleteFolder(folder.id, e)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
