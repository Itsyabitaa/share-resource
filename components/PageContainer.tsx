import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  maxWidth?: string
  style?: React.CSSProperties
}

export default function PageContainer({
  children,
  maxWidth = '1200px',
  style
}: PageContainerProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        margin: '0 auto',
        padding: '0 var(--space-4) var(--space-12) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        fontFamily: 'var(--font-sans)',
        ...style
      }}
      className="page-container"
    >
      {children}
    </div>
  )
}
