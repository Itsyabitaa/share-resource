import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export default React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = '', style, id, ...props },
  ref
) {
  const textareaId = id || `textarea-${Math.random().toString(36).substring(7)}`

  return (
    <div style={{ marginBottom: '1.25rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={textareaId}
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

      <textarea
        ref={ref}
        id={textareaId}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: 'var(--font-base)',
          fontFamily: 'var(--font-sans)',
          borderRadius: 'var(--radius-md)',
          border: error ? '2px solid var(--color-error)' : '2px solid var(--color-border)',
          backgroundColor: 'var(--color-input-bg)',
          color: 'var(--color-text)',
          outline: 'none',
          transition: 'all var(--transition-fast)',
          minHeight: '120px',
          resize: 'vertical',
          lineHeight: 'var(--leading-normal)',
          ...style
        }}
        className={`form-textarea ${className}`}
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
        textarea:focus {
          border-color: var(--color-accent);
          background-color: var(--color-surface);
          box-shadow: 0 0 0 3px var(--color-accent-light);
        }
      `}</style>
    </div>
  )
})
