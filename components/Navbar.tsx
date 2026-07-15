import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from '../lib/auth-client'
import { useTheme } from '../lib/ThemeContext'
import { useSidebar } from '../lib/SidebarContext'
import Button from './ui/Button'

interface NavbarProps {
  onResetCreate?: () => void
}

export default function Navbar({ onResetCreate }: NavbarProps = {}) {
  const { theme, toggleTheme } = useTheme()
  const { isSidebarOpen, toggleSidebar } = useSidebar()
  const router = useRouter()
  const { data: session } = useSession()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-4) 0',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-6)',
        backgroundColor: 'transparent'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
        {session?.user && (
          <button
            onClick={toggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: 'var(--font-xl)',
              cursor: 'pointer',
              padding: '0 var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity var(--transition-fast)'
            }}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={isSidebarOpen}
            className="sidebar-toggle-btn"
          >
            ☰
          </button>
        )}
        
        <Link href="/" onClick={() => onResetCreate && onResetCreate()}>
          {router.pathname === '/' ? (
            <h1
              style={{
                fontSize: 'var(--font-2xl)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-text)',
                letterSpacing: '-0.03em',
                cursor: 'pointer',
                userSelect: 'none',
                margin: 0,
                display: 'inline'
              }}
            >
              md-Nest
            </h1>
          ) : (
            <span
              style={{
                fontSize: 'var(--font-2xl)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-text)',
                letterSpacing: '-0.03em',
                cursor: 'pointer',
                userSelect: 'none',
                margin: 0,
                display: 'inline'
              }}
            >
              md-Nest
            </span>
          )}
        </Link>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'var(--space-2)' }}>
          <Link href="/" onClick={() => onResetCreate && onResetCreate()}>
            <span className={`nav-link ${router.pathname === '/' ? 'active' : ''}`}>
              Create
            </span>
          </Link>
          <Link href="/explore">
            <span className={`nav-link ${router.pathname === '/explore' ? 'active' : ''}`}>
              Explore
            </span>
          </Link>
          <Link href="/about">
            <span className={`nav-link ${router.pathname === '/about' ? 'active' : ''}`}>
              About
            </span>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Dark/Light mode toggler */}
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleTheme}
          style={{ padding: '0 var(--space-3)', height: '36px' }}
        >
          <span>{theme === 'light' ? '🌙' : '☀️'}</span>
          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 'var(--weight-semibold)' }}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </span>
        </Button>

        {/* User profile dropdown or Sign In */}
        {session?.user ? (
          <div style={{ position: 'relative' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '0 var(--space-3)',
                height: '36px'
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'var(--weight-bold)'
                }}
              >
                {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
              </span>
              <span style={{ fontSize: 'var(--font-xs)' }}>Profile</span>
              <span style={{ fontSize: '8px', opacity: 0.7 }}>▼</span>
            </Button>

            {showProfileMenu && (
              <>
                {/* Click outside overlay */}
                <div
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                />

                {/* Dropdown popup */}
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 15px -3px var(--color-shadow), 0 4px 6px -2px var(--color-shadow)',
                    minWidth: '220px',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'dropdown-slide-in var(--transition-fast) forwards'
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-sans)'
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--color-text)',
                        fontWeight: 'var(--weight-semibold)',
                        fontSize: 'var(--font-sm)',
                        marginBottom: '2px'
                      }}
                    >
                      {session.user.name || 'User'}
                    </div>
                    <div
                      style={{
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--font-xs)',
                        wordBreak: 'break-all'
                      }}
                    >
                      {session.user.email}
                    </div>
                  </div>

                  <div style={{ padding: '6px' }}>
                    <Link href="/settings" onClick={() => setShowProfileMenu(false)}>
                      <button className="dropdown-item">⚙️ Settings</button>
                    </Link>
                    <button onClick={handleSignOut} className="dropdown-item danger">
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        )}
      </div>

      <style jsx>{`
        .sidebar-toggle-btn:hover {
          opacity: 0.7;
        }
        
        .nav-link {
          color: var(--color-text-muted);
          text-decoration: none;
          font-weight: var(--weight-medium);
          font-size: var(--font-sm);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .nav-link:hover {
          color: var(--color-text);
          background-color: var(--color-surface-hover);
        }
        .nav-link.active {
          color: var(--color-accent);
          font-weight: var(--weight-bold);
          background-color: var(--color-accent-light);
        }

        .dropdown-item {
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: var(--radius-sm);
          text-align: left;
          color: var(--color-text);
          font-size: var(--font-sm);
          font-weight: var(--weight-medium);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: block;
        }
        .dropdown-item:hover {
          background-color: var(--color-surface-hover);
        }
        .dropdown-item.danger {
          color: var(--color-error);
        }
        .dropdown-item.danger:hover {
          background-color: var(--color-error-light);
        }

        @keyframes dropdown-slide-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </nav>
  )
}
