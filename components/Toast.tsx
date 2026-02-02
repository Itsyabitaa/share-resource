import React, { useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext'

interface ToastProps {
    message: string
    type: 'success' | 'error'
    onClose: () => void
    duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    const { theme } = useTheme()

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: type === 'success'
                ? (theme === 'dark' ? '#1a1a1a' : '#ffffff')
                : (theme === 'dark' ? '#1a1a1a' : '#ffffff'),
            color: theme === 'dark' ? '#ffffff' : '#000000',
            padding: '16px 20px',
            borderRadius: '10px',
            boxShadow: theme === 'dark'
                ? '0 10px 40px rgba(0, 0, 0, 0.5)'
                : '0 10px 40px rgba(0, 0, 0, 0.15)',
            border: `2px solid ${type === 'success'
                ? (theme === 'dark' ? '#ffffff' : '#000000')
                : (theme === 'dark' ? '#ff4444' : '#ff0000')}`,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            maxWidth: '500px',
            animation: 'slideInRight 0.3s ease, fadeOut 0.3s ease ' + (duration - 300) + 'ms forwards'
        }}>
            <span style={{ fontSize: '20px' }}>
                {type === 'success' ? '✓' : '✕'}
            </span>
            <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                {message}
            </span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0',
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
                ×
            </button>

            <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
      `}</style>
        </div>
    )
}
