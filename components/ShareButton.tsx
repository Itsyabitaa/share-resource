import React from 'react'

interface ShareButtonProps {
  text: string
  onShare: () => void
}

export default function ShareButton({ text, onShare }: ShareButtonProps) {
  const ready = Boolean(text && text.trim())

  return (
    <button
      type="button"
      className="btn-share"
      onClick={onShare}
      disabled={!ready}
    >
      {ready ? 'Share this nest' : 'Write to share'}
    </button>
  )
}
