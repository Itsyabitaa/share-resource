import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import Sidebar from './Sidebar'
import Header from './Header'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const { colors } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [viewedFolderId, setViewedFolderId] = useState<string | null>(null)

  // Pages that shouldn't have the standard layout
  const noLayoutPages = ['/login', '/signup']
  if (noLayoutPages.includes(router.pathname)) {
    return <>{children}</>
  }

  // Handle Create New File in Folder
  const handleCreateFileInFolder = (folderId: string) => {
    router.push(`/?targetFolderId=${folderId}`)
  }

  // Handle Create global button
  const handleResetCreate = () => {
    router.push('/?reset=true')
  }

  const showSidebar = !!session?.user && isSidebarOpen

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.background }}>
      {showSidebar && (
        <Sidebar
          activeFolderId={viewedFolderId}
          onSelectFolder={setViewedFolderId}
          onCreateFileInFolder={handleCreateFileInFolder}
        />
      )}

      <div
        style={{
          flex: 1,
          marginLeft: showSidebar ? '260px' : '0',
          transition: 'margin-left 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            maxWidth: 800,
            width: '100%',
            margin: '0 auto',
            padding: 20,
            color: colors.text,
            transition: 'color 0.3s ease',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Header
            onToggleSidebar={session?.user ? () => setIsSidebarOpen(!isSidebarOpen) : undefined}
            isSidebarOpen={isSidebarOpen}
            onResetCreate={handleResetCreate}
          />
          {children}
        </div>
      </div>
    </div>
  )
}
