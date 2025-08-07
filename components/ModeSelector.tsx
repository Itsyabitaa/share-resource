import React from 'react'
import { useTheme } from '../lib/ThemeContext'

interface ModeSelectorProps {
  mode: 'editor' | 'upload'
  onModeChange: (mode: 'editor' | 'upload') => void
}

export default function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const { colors } = useTheme()

  return (
    <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
      <button
        onClick={() => onModeChange('editor')}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          backgroundColor: mode === 'editor' ? colors.buttonBackground : colors.cardBackground,
          color: mode === 'editor' ? colors.buttonText : colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        Text Editor
      </button>
      <button
        onClick={() => onModeChange('upload')}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          backgroundColor: mode === 'upload' ? colors.buttonBackground : colors.cardBackground,
          color: mode === 'upload' ? colors.buttonText : colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        Upload File
      </button>
    </div>
  )
}
