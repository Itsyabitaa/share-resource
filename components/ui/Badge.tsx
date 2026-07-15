import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'outline'
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export default function Badge({
  children,
  variant = 'default',
  onClick,
  className = '',
  style
}: BadgeProps) {
  const isClickable = !!onClick
  const Element = isClickable ? 'button' : 'span'

  return (
    <Element
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        fontSize: 'var(--font-xs)',
        fontWeight: 'var(--weight-semibold)',
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-full)',
        transition: 'all var(--transition-fast)',
        cursor: isClickable ? 'pointer' : 'default',
        userSelect: 'none',
        ...style
      }}
      className={`ui-badge badge-${variant} ${className}`}
    >
      {children}

      <style jsx>{`
        button.ui-badge {
          background: none;
          border: none;
          outline: none;
          font-family: inherit;
        }

        .badge-default {
          background-color: var(--color-surface-hover);
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
        }
        .badge-default:hover {
          background-color: var(--color-border);
          color: var(--color-text);
        }

        .badge-accent {
          background-color: var(--color-accent-light);
          color: var(--color-accent);
          border: 1px solid transparent;
        }
        .badge-accent:hover {
          background-color: var(--color-accent);
          color: #ffffff;
        }

        .badge-outline {
          background-color: transparent;
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
        }
        .badge-outline:hover {
          border-color: var(--color-text-muted);
          color: var(--color-text);
        }
      `}</style>
    </Element>
  )
}
