import React from 'react'

interface ModeSelectorProps {
  mode: 'editor' | 'upload'
  onModeChange: (mode: 'editor' | 'upload') => void
}

export default function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Create mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'editor'}
        className={`mode-tab${mode === 'editor' ? ' is-active' : ''}`}
        onClick={() => onModeChange('editor')}
      >
        Write
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'upload'}
        className={`mode-tab${mode === 'upload' ? ' is-active' : ''}`}
        onClick={() => onModeChange('upload')}
      >
        Upload
      </button>
    </div>
  )
}
