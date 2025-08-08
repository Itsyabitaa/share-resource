import { useTheme } from '../lib/ThemeContext'
import Link from 'next/link'

export default function AboutPage() {
  const { colors, theme, toggleTheme } = useTheme()

  return (
    <div style={{ 
      maxWidth: 800, 
      margin: '0 auto', 
      padding: 20,
      backgroundColor: colors.background,
      color: colors.text,
      minHeight: '100vh',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      {/* Header with theme toggle */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 30 
      }}>
        <div>
          <h1 style={{ color: colors.text, marginBottom: '8px' }}>About mdnest</h1>
          <p style={{ color: colors.secondary, fontSize: '16px' }}>
            A modern markdown sharing platform
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/" passHref>
            <button
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
              🏠 Home
            </button>
          </Link>
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

      {/* Main Content */}
      <div style={{ lineHeight: '1.6' }}>
        
        {/* Platform Description */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            fontSize: '1.8em', 
            marginBottom: '20px', 
            color: colors.text,
            borderBottom: `2px solid ${colors.primary}`,
            paddingBottom: '10px'
          }}>
            What is mdnest?
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '15px', color: colors.text }}>
            mdnest is a modern platform for creating, editing, and sharing markdown documents. 
            Whether you're a developer writing documentation, a student taking notes, or a content creator 
            sharing articles, mdnest provides a seamless experience for all your markdown needs.
          </p>
          <p style={{ fontSize: '16px', color: colors.text }}>
            Built with performance and user experience in mind, mdnest combines the simplicity of markdown 
            with powerful features like real-time editing, file uploads, and beautiful themes.
          </p>
        </section>

        {/* How to Use */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            fontSize: '1.8em', 
            marginBottom: '20px', 
            color: colors.text,
            borderBottom: `2px solid ${colors.primary}`,
            paddingBottom: '10px'
          }}>
            How to Use
          </h2>
          <div style={{ 
            padding: '20px', 
            backgroundColor: colors.cardBackground, 
            borderRadius: '10px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ color: colors.primary, marginBottom: '15px' }}>Getting Started</h3>
            <ol style={{ color: colors.text, fontSize: '16px', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '10px' }}>
                <strong>Choose your method:</strong> Use the text editor to write directly, or upload an existing file (TXT, DOC, DOCX, MD)
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Add details:</strong> Enter a title for your document and optionally add an author name
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Share:</strong> Click "Share" to generate a unique link that you can copy and share with others
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Explore:</strong> Visit the Explore page to discover public documents shared by the community
              </li>
            </ol>
          </div>
        </section>

        {/* Copyright */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            fontSize: '1.8em', 
            marginBottom: '20px', 
            color: colors.text,
            borderBottom: `2px solid ${colors.primary}`,
            paddingBottom: '10px'
          }}>
            Copyright
          </h2>
          <div style={{ 
            padding: '20px', 
            backgroundColor: colors.cardBackground, 
            borderRadius: '10px',
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ color: colors.text, fontSize: '16px', marginBottom: '15px' }}>
              © 2024 mdnest. All rights reserved.
            </p>
            <p style={{ color: colors.text, fontSize: '16px', marginBottom: '15px' }}>
              This platform is designed to facilitate the sharing of markdown content. 
              Users retain ownership of their content and are responsible for ensuring they have the right to share it.
            </p>
            <p style={{ color: colors.text, fontSize: '16px' }}>
              Built with Next.js, React, and TypeScript.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ 
          marginTop: '60px', 
          padding: '20px 0', 
          borderTop: `1px solid ${colors.border}`,
          textAlign: 'center',
          color: colors.secondary,
          fontSize: '14px'
        }}>
          <p>Built with ❤️ for the markdown community</p>
        </footer>
      </div>
    </div>
  )
}
