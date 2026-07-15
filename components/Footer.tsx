import React from 'react'

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        transition: 'all var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
        <p style={{ margin: 'var(--space-1) 0', fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
          Made with ❤️ by{' '}
          <a
            href="https://github.com/Itsyabitaa"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Dev Kukusha
          </a>
        </p>
        <p style={{ margin: 'var(--space-1) 0', fontSize: 'var(--font-xs)', color: 'var(--color-text-weak)' }}>
          <a
            href="https://github.com/Itsyabitaa/share-resource"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            View on GitHub
          </a>
        </p>
      </div>

      <style jsx>{`
        .footer-link {
          color: var(--color-accent);
          text-decoration: none;
          font-weight: var(--weight-medium);
          transition: all var(--transition-fast);
          border-bottom: 1px solid transparent;
        }
        .footer-link:hover {
          color: var(--color-accent-hover);
          border-bottom-color: var(--color-accent-hover);
        }
      `}</style>
    </footer>
  )
}
