import React, { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from '../lib/auth-client'

export default function Header() {
  const { theme, toggleTheme, colors } = useTheme()
  const router = useRouter()
  const { data: session } = useSession()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Debug logging
  console.log('Header - Session data:', session)
  console.log('Header - Has user?:', !!session?.user)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h1 style={{ color: colors.text }}>md-Nest</h1>
        <nav style={{ display: 'flex', gap: '15px' }}>
          <Link href="/" style={{
            color: router.pathname === '/' ? colors.primary : colors.text,
            textDecoration: 'none',
            fontWeight: router.pathname === '/' ? '600' : '400',
            padding: '8px 12px',
            borderRadius: '5px',
            transition: 'all 0.2s ease'
          }}>
            Create
          </Link>
          <Link href="/explore" style={{
            color: router.pathname === '/explore' ? colors.primary : colors.text,
            textDecoration: 'none',
            fontWeight: router.pathname === '/explore' ? '600' : '400',
            padding: '8px 12px',
            borderRadius: '5px',
            transition: 'all 0.2s ease'
          }}>
            Explore
          </Link>
          <Link href="/about" style={{
            color: router.pathname === '/about' ? colors.primary : colors.text,
            textDecoration: 'none',
            fontWeight: router.pathname === '/about' ? '600' : '400',
            padding: '8px 12px',
            borderRadius: '5px',
            transition: 'all 0.2s ease'
          }}>
            About
          </Link>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Dark mode toggle - moved to the left */}
        <button
          onClick={toggleTheme}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: colors.buttonBackground,
            color: colors.buttonText,
            border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#e5e5e5'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#f5f5f5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.buttonBackground
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
        </button>

        {/* Profile or Sign In button - moved to the right */}
        {session?.user ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: colors.buttonBackground,
                color: colors.buttonText,
                border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#e5e5e5'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.buttonBackground
              }}
            >
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
                color: theme === 'dark' ? '#000000' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
              </span>
              Profile
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>

            {showProfileMenu && (
              <>
                {/* Backdrop to close menu when clicking outside */}
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

                {/* Dropdown menu */}
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                  border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#e5e5e5'}`,
                  borderRadius: '10px',
                  boxShadow: theme === 'dark'
                    ? '0 10px 40px rgba(0, 0, 0, 0.5)'
                    : '0 10px 40px rgba(0, 0, 0, 0.1)',
                  minWidth: '220px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  animation: 'slideDown 0.2s ease'
                }}>
                  <div style={{
                    padding: '16px',
                    borderBottom: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#e5e5e5'}`
                  }}>
                    <div style={{
                      color: colors.text,
                      fontWeight: '600',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {session.user.name || 'User'}
                    </div>
                    <div style={{
                      color: colors.text,
                      opacity: 0.6,
                      fontSize: '13px'
                    }}>
                      {session.user.email}
                    </div>
                  </div>

                  <div style={{ padding: '8px' }}>
                    <Link href="/settings" onClick={() => setShowProfileMenu(false)}>
                      <button
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          backgroundColor: 'transparent',
                          color: colors.text,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#f5f5f5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <span>⚙️</span>
                        Settings
                      </button>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        color: colors.text,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2a2a2a' : '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>🚪</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link href="/login">
            <button
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
                color: theme === 'dark' ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              Sign In
            </button>
          </Link>
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
