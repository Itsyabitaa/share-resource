import React from 'react'
import { useTheme } from '../lib/ThemeContext'

export default function Header() {
  const { theme, toggleTheme, colors } = useTheme()

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 30 
    }}>
      <h1 style={{ color: colors.text }}>Create & Share Markdown</h1>
      <button
        onClick={toggleTheme}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: colors.buttonBackground,
          color: colors.buttonText,
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </div>
  )
}
