import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', style, id, ...props },
  ref
) {
  const inputId = id || `input-${Math.random().toString(36).substring(7)}`

  return (
    <div style={{ marginBottom: '1.25rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-text)',
            fontSize: 'var(--font-sm)',
            fontWeight: 'var(--weight-medium)',
            fontFamily: 'var(--font-sans)'
          }}
        >
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 'var(--font-base)',
          fontFamily: 'var(--font-sans)',
          borderRadius: 'var(--radius-md)',
          border: error ? '2px solid var(--color-error)' : '2px solid var(--color-border)',
          backgroundColor: 'var(--color-input-bg)',
          color: 'var(--color-text)',
          outline: 'none',
          transition: 'all var(--transition-fast)',
          ...style
        }}
        className={`form-input ${className}`}
        {...props}
      />

      {error && (
        <span
          style={{
            display: 'block',
            marginTop: 'var(--space-1)',
            color: 'var(--color-error)',
            fontSize: 'var(--font-xs)',
            fontFamily: 'var(--font-sans)'
          }}
        >
          {error}
        </span>
      )}

      <style jsx>{`
        input:focus {
          border-color: var(--color-accent);
          background-color: var(--color-surface);
          box-shadow: 0 0 0 3px var(--color-accent-light);
        }
      `}</style>
    </div>
  )
})
