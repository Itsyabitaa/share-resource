import React from 'react'
import { useTheme } from '../lib/ThemeContext'

interface FileUploadProps {
  uploadedFile: File | null
  isConverting: boolean
  showAuthor: boolean
  author: string
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onShowAuthorChange: (checked: boolean) => void
  onAuthorChange: (value: string) => void
}

export default function FileUpload({
  uploadedFile,
  isConverting,
  showAuthor,
  author,
  onFileUpload,
  onShowAuthorChange,
  onAuthorChange
}: FileUploadProps) {
  const { colors } = useTheme()

  return (
    <div style={{ 
      marginBottom: 20, 
      padding: '30px', 
      border: `2px dashed ${colors.primary}`, 
      borderRadius: '10px',
      textAlign: 'center',
      backgroundColor: colors.cardBackground
    }}>
      <input
        type="file"
        accept=".txt,.doc,.docx,.md"
        onChange={onFileUpload}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
        <div style={{ fontSize: '20px', marginBottom: '10px', color: colors.primary }}>
          {isConverting ? '🔄 Converting...' : '📁 Click to upload a file'}
        </div>
        <div style={{ fontSize: '14px', color: colors.secondary, marginBottom: '15px' }}>
          Supported formats: TXT, DOC, DOCX, MD
        </div>
        <div style={{ 
          padding: '10px 20px', 
          backgroundColor: colors.buttonBackground, 
          color: colors.buttonText, 
          borderRadius: '5px',
          display: 'inline-block'
        }}>
          Choose File
        </div>
      </label>
      {uploadedFile && (
        <div style={{ marginTop: '15px', fontSize: '14px', color: colors.primary }}>
          ✅ Selected: {uploadedFile.name}
        </div>
      )}
      
      {/* Author field for upload mode */}
      <div style={{ 
        marginTop: '20px', 
        textAlign: 'left',
        padding: '20px',
        backgroundColor: colors.inputBackground,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '10px'
        }}>
          <input
            type="checkbox"
            id="show-author-upload"
            checked={showAuthor}
            onChange={(e) => onShowAuthorChange(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label 
            htmlFor="show-author-upload" 
            style={{ 
              color: colors.text,
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Add author acknowledgment
          </label>
        </div>
        
        {showAuthor && (
          <input
            type="text"
            value={author}
            onChange={(e) => onAuthorChange(e.target.value)}
            placeholder="Enter your name or handle..."
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              backgroundColor: colors.inputBackground,
              color: colors.text,
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border
            }}
          />
        )}
      </div>
    </div>
  )
}
