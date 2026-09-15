import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'
import { useSession, signOut } from '../lib/auth-client'
import { useSidebar } from '../lib/SidebarContext'
import { useAppPaths } from '../lib/appPaths'
import BrandMark from './BrandMark'

export interface HeaderProps {
  onResetCreate?: () => void
}

export default function Header({ onResetCreate }: HeaderProps = {}) {
  const { theme, toggleTheme } = useTheme()
  const { isSidebarOpen, toggleSidebar } = useSidebar()
  const router = useRouter()
  const { data: session } = useSession()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { sitePath } = useAppPaths()

  useEffect(() => {
    setMobileNavOpen(false)
    setShowProfileMenu(false)
  }, [router.pathname])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = sitePath('/')
  }

  const navItems = [
    { href: sitePath('/'), label: 'Create', match: '/' },
    { href: sitePath('/explore'), label: 'Explore', match: '/explore' },
    { href: sitePath('/about'), label: 'About', match: '/about' },
  ]

  const isActive = (match: string) => router.pathname === match

  return (
    <header className="site-header">
      <div className="header-left">
        {session?.user && (
          <button
            className="icon-btn"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? 'Close workspace' : 'Open workspace'}
            title={isSidebarOpen ? 'Close workspace' : 'Open workspace'}
            type="button"
          >
            ☰
          </button>
        )}

        <BrandMark
          href={sitePath('/')}
          size={30}
        />

        <nav className="header-nav" aria-label="Primary">
          {navItems.map(item => (
            <Link
              key={item.match}
              href={item.href}
              className={`nav-link${isActive(item.match) ? ' is-active' : ''}`}
              onClick={() => {
                if (item.match === '/' && onResetCreate) {
                  onResetCreate()
                }
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="header-right">
        <button
          className="icon-btn"
          onClick={toggleTheme}
          type="button"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>

        {session?.user ? (
          <div style={{ position: 'relative' }}>
            <button
              className="header-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              type="button"
              aria-expanded={showProfileMenu}
            >
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--brand)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700
              }}>
                {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
              </span>
              <span className="label">Account</span>
            </button>

            {showProfileMenu && (
              <>
                <div
                  onClick={() => setShowProfileMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                />
                <div className="profile-menu" style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  zIndex: 1000,
                  borderRadius: 12,
                  padding: 8,
                  border: '1px solid rgba(120,113,108,0.22)',
                  background: theme === 'dark' ? '#1c1917' : '#fff',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.16)'
                }}>
                  <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid rgba(120,113,108,0.18)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{session.user.name || 'User'}</div>
                    <div style={{ opacity: 0.6, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.user.email}
                    </div>
                  </div>
                  <Link href={sitePath('/settings')} onClick={() => setShowProfileMenu(false)}>
                    <span className="nav-link" style={{ display: 'block' }}>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="nav-link"
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link href={sitePath('/login')} className="header-btn primary desktop-only">
            Sign in
          </Link>
        )}

        <button
          className="icon-btn nav-toggle"
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(open => !open)}
        >
          {mobileNavOpen ? '✕' : '⋯'}
        </button>
      </div>

      {mobileNavOpen && (
        <div className="header-drawer" style={{
          position: 'absolute',
          top: 'var(--header-height)',
          left: 0,
          right: 0,
          zIndex: 70,
          background: theme === 'dark' ? '#121110' : '#f7f6f3'
        }}>
          {navItems.map(item => (
            <Link
              key={item.match}
              href={item.href}
              className={`nav-link${isActive(item.match) ? ' is-active' : ''}`}
              onClick={() => {
                setMobileNavOpen(false)
                if (item.match === '/' && onResetCreate) {
                  onResetCreate()
                }
              }}
            >
              {item.label}
            </Link>
          ))}
          {!session?.user && (
            <Link href={sitePath('/login')} className="header-btn primary" style={{ marginTop: 8 }}>
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
