import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  hoverable?: boolean
}

export default function Card({
  children,
  className = '',
  style,
  onClick,
  hoverable = false
}: CardProps) {
  const isClickable = !!onClick

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: '0 4px 6px -1px var(--color-shadow), 0 2px 4px -1px var(--color-shadow)',
        transition: 'transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal)',
        cursor: isClickable ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      className={`ui-card ${hoverable ? 'hoverable' : ''} ${className}`}
    >
      {children}

      <style jsx>{`
        .hoverable:hover {
          transform: translateY(-4px);
          border-color: var(--color-accent);
          box-shadow: 0 10px 15px -3px var(--color-shadow), 0 4px 6px -2px var(--color-shadow);
        }
      `}</style>
    </div>
  )
}
