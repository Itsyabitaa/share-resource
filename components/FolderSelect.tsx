import React, { useState, useEffect } from 'react'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { Folder } from './Sidebar'
import { useAppPaths } from '../lib/appPaths'

interface FolderSelectProps {
  activeFolderId: string | null
  onChange: (folderId: string | null) => void
}

export default function FolderSelect({ activeFolderId, onChange }: FolderSelectProps) {
  const { data: session } = useSession()
  const { colors } = useTheme()
  const { apiPath } = useAppPaths()
  const [folders, setFolders] = useState<Folder[]>([])

  // Fetch folders independently or listen to updates
  // Since Sidebar also fetches, we just fetch once on mount. 
  // In a more complex app, this would use a global state manager (e.g. Zustand) or SWR.
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
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontWeight: '500' }}>
        📁 Save to Folder
      </label>
      <select
        value={activeFolderId || ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: '16px',
          border: `1px solid ${colors.border}`,
          borderRadius: '5px',
          backgroundColor: colors.inputBackground,
          color: colors.text,
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="">No Folder (All Files)</option>
        {folders.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </div>
  )
}
