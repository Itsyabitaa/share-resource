import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 10px 15px -3px var(--color-shadow), 0 4px 6px -2px var(--color-shadow)',
        border: `2px solid ${type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '280px',
        maxWidth: '480px',
        fontFamily: 'var(--font-sans)',
        animation: 'slide-in-right 0.3s ease, fade-out 0.3s ease ' + (duration - 300) + 'ms forwards'
      }}
      className={`toast-notification toast-${type}`}
    >
      <span
        style={{
          fontSize: 'var(--font-lg)',
          color: type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
          fontWeight: 'var(--weight-bold)'
        }}
      >
        {type === 'success' ? '✓' : '✕'}
      </span>
      <span style={{ flex: 1, fontSize: 'var(--font-sm)', fontWeight: 'var(--weight-medium)' }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-xl)',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          transition: 'color var(--transition-fast)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
      >
        &times;
      </button>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fade-out {
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
      `}</style>
    </div>
  )
}
