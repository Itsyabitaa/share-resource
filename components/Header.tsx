import React, { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from '../lib/auth-client'
import AuthModal from './AuthModal'

export default function Header() {
  const { theme, toggleTheme, colors } = useTheme()
  const router = useRouter()
  const { data: session } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    window.location.reload()
  }

  return (
    <>
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
          {session?.user ? (
            <>
              <span style={{
                color: colors.text,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: colors.buttonBackground,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Sign In
            </button>
          )}

          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: colors.buttonBackground,
              color: colors.buttonText,
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
