import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        outline: 'none',
        border: 'none',
        ...style
      }}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: '1em', height: '1em', animation: 'spin 1s linear infinite' }}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            style={{ opacity: 0.25 }}
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}

      <style jsx>{`
        .btn-primary {
          background-color: var(--color-text);
          color: var(--color-bg);
        }
        .btn-primary:not(:disabled):hover {
          background-color: var(--color-accent);
          color: #ffffff;
        }

        .btn-secondary {
          background-color: var(--color-surface-hover);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }
        .btn-secondary:not(:disabled):hover {
          background-color: var(--color-border);
        }

        .btn-success {
          background-color: var(--color-success);
          color: #ffffff;
        }
        .btn-success:not(:disabled):hover {
          opacity: 0.9;
        }

        .btn-danger {
          background-color: var(--color-error);
          color: #ffffff;
        }
        .btn-danger:not(:disabled):hover {
          opacity: 0.9;
        }

        .btn-outline {
          background-color: transparent;
          color: var(--color-text);
          border: 2px solid var(--color-border);
        }
        .btn-outline:not(:disabled):hover {
          border-color: var(--color-text);
          background-color: var(--color-surface-hover);
        }

        .btn-ghost {
          background-color: transparent;
          color: var(--color-text);
        }
        .btn-ghost:not(:disabled):hover {
          background-color: var(--color-surface-hover);
        }

        /* Sizes */
        .btn-sm {
          padding: var(--space-1) var(--space-3);
          font-size: var(--font-xs);
          height: 32px;
        }
        .btn-md {
          padding: var(--space-2) var(--space-4);
          font-size: var(--font-sm);
          height: 40px;
        }
        .btn-lg {
          padding: var(--space-3) var(--space-6);
          font-size: var(--font-base);
          height: 48px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  )
}
