import React, { createContext, useContext, useEffect, useState } from 'react'

interface SidebarContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isSidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {}
})

const DESKTOP_QUERY = '(min-width: 901px)'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const apply = () => setIsSidebarOpen(mq.matches)
    apply()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }

    mq.addListener(apply)
    return () => mq.removeListener(apply)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar: () => setIsSidebarOpen(open => !open),
        closeSidebar: () => setIsSidebarOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
