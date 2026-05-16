import React, { useState, useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { useSession } from '../lib/auth-client'

export interface Folder {
  id: string
  name: string
  created_at: string
}

interface SidebarProps {
  activeFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  onCreateFileInFolder?: (folderId: string) => void
}

export default function Sidebar({ activeFolderId, onSelectFolder, onCreateFileInFolder }: SidebarProps) {
  const { colors, theme } = useTheme()
  const { data: session } = useSession()
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeFiles, setActiveFiles] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  useEffect(() => {
    if (session?.user) {
      fetchFolders()
    }
  }, [session])

  useEffect(() => {
    if (session?.user) {
      if (activeFolderId) {
        fetchFilesByFolder(activeFolderId)
      } else {
        fetchAllUserFiles()
      }
    }
  }, [activeFolderId, session])

  const fetchFilesByFolder = async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`)
      if (res.ok) {
        const data = await res.json()
        setActiveFiles(data.files)
      }
    } catch (error) {
      console.error('Failed to fetch files for folder:', error)
    }
  }

  const fetchAllUserFiles = async () => {
    try {
      const res = await fetch('/api/user/files')
      if (res.ok) {
        const data = await res.json()
        // Filter out files that belong to a folder, so this section acts as the root/unassigned directory
        setActiveFiles(data.files.filter((f: any) => !f.folder_id))
      }
    } catch (error) {
      console.error('Failed to fetch all user files:', error)
    }
  }

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      if (res.ok) {
        const data = await res.json()
        setFolders(data.folders)
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      })

      if (res.ok) {
        const data = await res.json()
        setFolders([...folders, data.folder])
        setNewFolderName('')
        setIsCreating(false)
        onSelectFolder(data.folder.id)
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this folder? Files inside will not be deleted, but will be unassigned from this folder.')) {
      return
    }

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setFolders(folders.filter(f => f.id !== folderId))
        if (activeFolderId === folderId) {
          onSelectFolder(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  if (!session?.user) return null

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      backgroundColor: theme === 'dark' ? '#171717' : '#f9f9f9',
      borderRight: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#e5e5e5'}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 10px',
      overflowY: 'auto'
    }}>
      <h2 style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: colors.text,
        opacity: 0.7,
        marginBottom: '15px',
        paddingLeft: '10px'
      }}>
        Workspace
      </h2>

      {/* All Files section */}
      <div>
        <button
          onClick={() => onSelectFolder(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: '10px',
            padding: '10px',
            backgroundColor: activeFolderId === null ? (theme === 'dark' ? '#2a2a2a' : '#e5e5e5') : 'transparent',
            color: colors.text,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: activeFolderId === null ? '4px' : '20px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (activeFolderId !== null) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#e5e5e5'
            }
          }}
          onMouseLeave={(e) => {
            if (activeFolderId !== null) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          <span style={{ fontSize: '18px' }}>📁</span>
          <span style={{ fontWeight: activeFolderId === null ? '600' : 'normal' }}>All Files</span>
        </button>

        {/* Render files if All Files is active */}
        {activeFolderId === null && (
          <div style={{ paddingLeft: '28px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activeFiles.length === 0 ? (
              <div style={{ fontSize: '12px', opacity: 0.5, padding: '4px 0' }}>No files</div>
            ) : (
              activeFiles.map(file => (
                <a
                  key={file.id}
                  href={`/file/${file.id}`}
                  style={{
                    display: 'block',
                    padding: '6px 8px',
                    fontSize: '13px',
                    color: colors.text,
                    textDecoration: 'none',
                    borderRadius: '6px',
                    opacity: 0.8,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'background-color 0.2s, opacity 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#e5e5e5'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.opacity = '0.8'
                  }}
                >
                  📄 {file.title || 'Untitled'}
                </a>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: '10px',
        paddingRight: '10px',
        marginBottom: '10px'
      }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: colors.text,
          opacity: 0.7,
          margin: 0
        }}>
          Folders
        </h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '18px',
            opacity: 0.7,
            padding: 0
          }}
          title="New Folder"
        >
          +
        </button>
      </div>

      {isCreating && (
        <div style={{ padding: '0 10px', marginBottom: '10px' }}>
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
            placeholder="Folder name..."
            autoFocus
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: `1px solid ${theme === 'dark' ? '#333' : '#ccc'}`,
              backgroundColor: theme === 'dark' ? '#222' : '#fff',
              color: colors.text,
              fontSize: '14px'
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {folders.map(folder => (
          <div key={folder.id}>
            <div
              onClick={() => onSelectFolder(folder.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                backgroundColor: activeFolderId === folder.id ? (theme === 'dark' ? '#2a2a2a' : '#e5e5e5') : 'transparent',
                color: colors.text,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeFolderId !== folder.id) {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#e5e5e5'
                }
              }}
              onMouseLeave={(e) => {
                if (activeFolderId !== folder.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <span style={{ fontSize: '18px', opacity: 0.7 }}>🗂️</span>
                <span style={{ 
                  fontWeight: activeFolderId === folder.id ? '600' : 'normal',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {folder.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {activeFolderId === folder.id && onCreateFileInFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateFileInFolder(folder.id)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      opacity: 0.5,
                      cursor: 'pointer',
                      padding: '2px 5px',
                      fontSize: '14px'
                    }}
                    title="Create file in this folder"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                  >
                    ➕
                  </button>
                )}
                {activeFolderId === folder.id && (
                  <button
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      opacity: 0.5,
                      cursor: 'pointer',
                      padding: '2px 5px'
                    }}
                    title="Delete Folder"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            {/* Render files if this folder is active */}
            {activeFolderId === folder.id && (
              <div style={{ paddingLeft: '28px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeFiles.length === 0 ? (
                  <div style={{ fontSize: '12px', opacity: 0.5, padding: '4px 0' }}>No files</div>
                ) : (
                  activeFiles.map(file => (
                    <a
                      key={file.id}
                      href={`/file/${file.id}`}
                      style={{
                        display: 'block',
                        padding: '6px 8px',
                        fontSize: '13px',
                        color: colors.text,
                        textDecoration: 'none',
                        borderRadius: '6px',
                        opacity: 0.8,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'background-color 0.2s, opacity 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#e5e5e5'
                        e.currentTarget.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.opacity = '0.8'
                      }}
                    >
                      📄 {file.title || 'Untitled'}
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
