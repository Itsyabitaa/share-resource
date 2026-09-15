import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useSidebar } from '../lib/SidebarContext'
import Sidebar from './Sidebar'
import Header from './Header'
import { AppPathProvider, getAppBasePath, useAppPaths } from '../lib/appPaths'

interface AppLayoutProps {
  children: React.ReactNode
}

function LayoutInner({ children }: AppLayoutProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { colors } = useTheme()
  const { isSidebarOpen, closeSidebar } = useSidebar()
  const { sitePath } = useAppPaths()
  const [viewedFolderId, setViewedFolderId] = useState<string | null>(null)

  const isAuthPage = router.pathname === '/login' || router.pathname === '/signup'

  const handleCreateFileInFolder = (folderId: string) => {
    router.push(`${sitePath('/')}?targetFolderId=${folderId}`)
  }

  const handleResetCreate = () => {
    router.push(`${sitePath('/')}?reset=true`)
  }

  if (isAuthPage) {
    return <>{children}</>
  }

  const showSidebar = !!session?.user && isSidebarOpen

  return (
    <div
      className={`app-shell${showSidebar ? ' sidebar-open' : ''}`}
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {session?.user && (
        <>
          {isSidebarOpen && (
            <div className="sidebar-backdrop" onClick={closeSidebar} />
          )}
          <Sidebar
            isOpen={isSidebarOpen}
            activeFolderId={viewedFolderId}
            onSelectFolder={setViewedFolderId}
            onCreateFileInFolder={handleCreateFileInFolder}
          />
        </>
      )}

      <div className="app-main">
        <Header onResetCreate={handleResetCreate} />
        {children}
      </div>
    </div>
  )
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const basePath = getAppBasePath(router.pathname, router.asPath, router.query)

  return (
    <AppPathProvider basePath={basePath}>
      <LayoutInner>{children}</LayoutInner>
    </AppPathProvider>
  )
}
