import React from 'react'
import { useTheme } from '../lib/ThemeContext'

interface ShareButtonProps {
  text: string
  onShare: () => void
}

export default function ShareButton({ text, onShare }: ShareButtonProps) {
  const { colors } = useTheme()

  if (!text) return null

  return (
    <button 
      onClick={onShare} 
      style={{ 
        padding: '10px 20px', 
        fontSize: '16px', 
        backgroundColor: colors.buttonBackground, 
        color: colors.buttonText, 
        border: 'none', 
        borderRadius: '5px', 
        cursor: 'pointer',
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.buttonHover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.buttonBackground
      }}
    >
      Share
    </button>
  )
}
