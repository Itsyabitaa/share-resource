import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useSidebar } from '../lib/SidebarContext'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'
import SiteAnnouncements from './SiteAnnouncements'
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
  const isAuthPage = router.pathname === '/login' || router.pathname === '/signup'

  const activeFolderId =
    router.pathname === '/workspace' && typeof router.query.folder === 'string'
      ? router.query.folder
      : null

  const handleSelectFolder = (folderId: string | null) => {
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

  const handleCreateFileInFolder = (folderId: string) => {
    router.push(`${sitePath('/')}?targetFolderId=${encodeURIComponent(folderId)}`)
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
      style={{ color: colors.text }}
    >
      <Header onResetCreate={handleResetCreate} />

      {session?.user && (
        <>
          {isSidebarOpen && (
            <div className="sidebar-backdrop" onClick={closeSidebar} />
          )}
          <Sidebar
            isOpen={isSidebarOpen}
            activeFolderId={activeFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFileInFolder={handleCreateFileInFolder}
          />
        </>
      )}

      <div className="app-main">
        <SiteAnnouncements />
        {children}
        <Footer />
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
