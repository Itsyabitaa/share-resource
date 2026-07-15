import React, { createContext, useContext, useMemo } from 'react'

type RouteQuery = Record<string, string | number | boolean | null | undefined>

interface AppPathHelpers {
  basePath: string
  sitePath: (path: string) => string
  apiPath: (path: string) => string
}

interface AppPathProviderProps {
  basePath: string
  children: React.ReactNode
}

const AppPathContext = createContext<AppPathHelpers | null>(null)

const staticRoutes = ['/explore', '/about', '/login', '/signup', '/settings']

function stripQueryAndHash(value: string) {
  return value.split('?')[0].split('#')[0]
}

function normalizeBasePath(value: string) {
  const cleaned = stripQueryAndHash(value).replace(/\/+$/, '')

  if (!cleaned || cleaned === '/') {
    return ''
  }

  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

function joinPaths(basePath: string, path: string) {
  const normalizedBasePath = normalizeBasePath(basePath)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${normalizedBasePath}${normalizedPath}` || '/'
}

export function getAppBasePath(pathname?: string, asPath?: string, query?: RouteQuery) {
  const cleanAsPath = stripQueryAndHash(asPath || pathname || '')
  const normalizedAsPath = cleanAsPath.replace(/\/+$/, '') || '/'
  const routePath = pathname || ''

  if (routePath === '/' || routePath === '') {
    return normalizeBasePath(normalizedAsPath)
  }

  const fileMatch = normalizedAsPath.match(/^(.*)\/file\/[^/]+$/)
  if (routePath.startsWith('/file/') || fileMatch) {
    return normalizeBasePath(fileMatch?.[1] || normalizedAsPath.replace(/\/file\/[^/]+$/, ''))
  }

  for (const route of staticRoutes) {
    if (routePath === route && normalizedAsPath.endsWith(route)) {
      return normalizeBasePath(normalizedAsPath.slice(0, -route.length))
    }
  }

  if (query && normalizedAsPath.includes('/file/')) {
    return normalizeBasePath(normalizedAsPath.replace(/\/file\/[^/]+$/, ''))
  }

  return normalizeBasePath(normalizedAsPath)
}

export function buildSitePath(path: string, basePath = '') {
  return joinPaths(basePath, path)
}

export function buildApiPath(path: string, basePath = '') {
  const normalizedBasePath = normalizeBasePath(basePath)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${normalizedBasePath}/api${normalizedPath}`
}

export function AppPathProvider({ basePath, children }: AppPathProviderProps) {
  const value = useMemo<AppPathHelpers>(() => {
    return {
      basePath: normalizeBasePath(basePath),
      sitePath: (path: string) => buildSitePath(path, basePath),
      apiPath: (path: string) => buildApiPath(path, basePath),
    }
  }, [basePath])

  return <AppPathContext.Provider value={value}>{children}</AppPathContext.Provider>
}

export function useAppPaths() {
  const context = useContext(AppPathContext)

  if (context) {
    return context
  }

  const fallbackBasePath = typeof window !== 'undefined' ? getAppBasePath(undefined, window.location.pathname) : ''

  return {
    basePath: fallbackBasePath,
    sitePath: (path: string) => buildSitePath(path, fallbackBasePath),
    apiPath: (path: string) => buildApiPath(path, fallbackBasePath),
  }
}
