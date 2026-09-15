import React, { useState, useEffect } from 'react'
import { useSession } from '../lib/auth-client'
import { Folder } from './Sidebar'
import { useAppPaths } from '../lib/appPaths'

interface FolderSelectProps {
  activeFolderId: string | null
  onChange: (folderId: string | null) => void
}

export default function FolderSelect({ activeFolderId, onChange }: FolderSelectProps) {
  const { data: session } = useSession()
  const { apiPath } = useAppPaths()
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    if (session?.user) {
      fetch(apiPath('/folders'))
        .then(res => res.json())
        .then(data => setFolders(data.folders))
        .catch(console.error)
    }
  }, [session])

  if (!session?.user) return null

  return (
    <div className="folder-select">
      <label htmlFor="save-folder">Folder</label>
      <select
        id="save-folder"
        value={activeFolderId || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">All files</option>
        {folders.map(folder => (
          <option key={folder.id} value={folder.id}>{folder.name}</option>
        ))}
      </select>
    </div>
  )
}
