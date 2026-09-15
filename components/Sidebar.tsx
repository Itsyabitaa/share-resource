import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useSession, signOut } from '../lib/auth-client'
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

function IconFolder({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconEdit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4.24-4.24L4 15.76V20z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDocs({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 4v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconInbox({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M4 10h5l2 3h2l2-3h5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconDashboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h7v9H4V4zM13 4h7v5h-7V4zM13 11h7v9h-7v-9zM4 15h7v5H4v-5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconExplore({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconCompose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9M4 20h1l8.5-8.5a1.5 1.5 0 0 0-4.24-4.24L1 15.76V20z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

function IconCollapse({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconPosts({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4h12v16H6V4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconTrending({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 18l6-6 4 4 6-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8h5v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconActivity({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconUsers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 19a4 4 0 0 0-8 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 19a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconAnalytics({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

type AdminTab = 'overview' | 'analytics' | 'posts' | 'viral' | 'activity' | 'accounts'

const adminNav: { tab: AdminTab; label: string; Icon: typeof IconDashboard }[] = [
  { tab: 'overview', label: 'Dashboard', Icon: IconDashboard },
  { tab: 'analytics', label: 'Analytics', Icon: IconAnalytics },
  { tab: 'posts', label: 'Posts', Icon: IconPosts },
  { tab: 'viral', label: 'Viral', Icon: IconTrending },
  { tab: 'activity', label: 'Activity', Icon: IconActivity },
  { tab: 'accounts', label: 'Accounts', Icon: IconUsers },
]

export default function Sidebar({
  isOpen = false,
  activeFolderId,
  onSelectFolder,
  onCreateFileInFolder,
}: SidebarProps) {
  const { data: session } = useSession()
  const { apiPath, sitePath } = useAppPaths()
  const { closeSidebar, toggleSidebar } = useSidebar()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({ all: 0, unassigned: 0 })
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free')

  const isWorkspace = router.pathname === '/workspace'
  const isDashboard = router.pathname === '/dashboard'
  const isExplore = router.pathname === '/explore'
  const isSettings = router.pathname === '/settings'
  const isAdminPage = router.pathname === '/admin'
  const adminTab = typeof router.query.tab === 'string' ? router.query.tab : 'overview'

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
    if (!session?.user) {
      setIsAdmin(false)
      setUserPlan('free')
      return
    }

    fetch(apiPath('/profile'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdmin(!!data?.isAdmin)
        setUserPlan(data?.plan === 'pro' ? 'pro' : 'free')
      })
      .catch(() => {
        setIsAdmin(false)
        setUserPlan('free')
      })
  }, [session?.user?.id, apiPath])

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

  const goAdmin = (tab: AdminTab) => {
    const href = tab === 'overview' ? sitePath('/admin') : `${sitePath('/admin')}?tab=${tab}`
    router.push(href)
    afterNavigate()
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

  const handleSignOut = async () => {
    await signOut()
    window.location.href = sitePath('/')
  }

  if (!session?.user) return null

  const userInitial = (session.user.name || session.user.email || 'U')[0].toUpperCase()
  const displayName = session.user.name || session.user.email?.split('@')[0] || 'Account'

  return (
    <aside className={`workspace-sidebar${isOpen ? ' is-open' : ''}`}>
      <div className="sidebar-top">
        <Link href={sitePath('/')} className="sidebar-brand" onClick={afterNavigate}>
          md-nest
        </Link>
        <button
          type="button"
          className="sidebar-icon-btn sidebar-collapse-btn"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <IconCollapse />
        </button>
      </div>

      <Link href={sitePath('/')} className="sidebar-primary-btn" onClick={afterNavigate}>
        <IconCompose />
        <span>New document</span>
      </Link>

      <div className="sidebar-scroll">
        <nav className="sidebar-menu" aria-label="Main">
          <button
            type="button"
            className={`sidebar-menu-item${isDashboard ? ' is-active' : ''}`}
            onClick={() => {
              router.push(sitePath('/dashboard'))
              afterNavigate()
            }}
          >
            <IconDashboard />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`sidebar-menu-item${activeKey === null && isWorkspace ? ' is-active' : ''}`}
            onClick={() => goWorkspace(null)}
          >
            <IconDocs />
            <span>All documents</span>
            <span className="sidebar-menu-meta">{fileCounts.all}</span>
          </button>
          <button
            type="button"
            className={`sidebar-menu-item${activeKey === 'unassigned' ? ' is-active' : ''}`}
            onClick={() => goWorkspace('unassigned')}
          >
            <IconInbox />
            <span>Unassigned</span>
            <span className="sidebar-menu-meta">{fileCounts.unassigned}</span>
          </button>
          <button
            type="button"
            className={`sidebar-menu-item${isExplore ? ' is-active' : ''}`}
            onClick={() => {
              router.push(sitePath('/explore'))
              afterNavigate()
            }}
          >
            <IconExplore />
            <span>Explore</span>
          </button>
          <button
            type="button"
            className={`sidebar-menu-item${isSettings ? ' is-active' : ''}`}
            onClick={() => {
              router.push(sitePath('/settings'))
              afterNavigate()
            }}
          >
            <IconSettings />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-group">
          <div className="sidebar-group-head">
            <span>Folders</span>
            <button
              type="button"
              className="sidebar-icon-btn"
              onClick={() => setIsCreating((open) => !open)}
              title="New folder"
              aria-label="New folder"
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
              <p className="sidebar-empty">No folders yet</p>
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
                  <div key={folder.id} className={`sidebar-folder-item${isActive ? ' is-active' : ''}`}>
                    <button type="button" className="sidebar-folder-main" onClick={() => goWorkspace(folder.id)}>
                      <span className="sidebar-folder-leading">
                        <IconFolder size={16} />
                        <span className="sidebar-folder-name">{folder.name}</span>
                      </span>
                      <span className="sidebar-count sidebar-folder-count">{fileCounts[folder.id] || 0}</span>
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

        {isAdmin && (
          <div className="sidebar-group sidebar-admin-section">
            <div className="sidebar-group-head">
              <span>Admin</span>
            </div>
            <nav className="sidebar-menu" aria-label="Admin">
              {adminNav.map(({ tab, label, Icon }) => {
                const isActive = isAdminPage && (adminTab === tab || (tab === 'overview' && !router.query.tab))
                return (
                  <button
                    key={tab}
                    type="button"
                    className={`sidebar-menu-item sidebar-admin-item${isActive ? ' is-active' : ''}`}
                    onClick={() => goAdmin(tab)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-user-card" onClick={() => { router.push(sitePath('/settings')); afterNavigate() }}>
          {session.user.image ? (
            <img src={session.user.image} alt="" className="sidebar-user-avatar" />
          ) : (
            <span className="sidebar-user-avatar placeholder">{userInitial}</span>
          )}
          <span className="sidebar-user-copy">
            <span className="sidebar-user-name">{displayName}</span>
            <span className="sidebar-user-plan">{userPlan === 'pro' ? 'Pro' : 'Free'}</span>
          </span>
        </button>
        <button type="button" className="sidebar-footer-link" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
