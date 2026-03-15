import { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { useRouter } from 'next/router'

interface LikeButtonProps {
  fileId: string
  initialLikeCount: number
  initialUserHasLiked: boolean
  isAuthenticated: boolean
}

export default function LikeButton({
  fileId,
  initialLikeCount,
  initialUserHasLiked,
  isAuthenticated
}: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [userHasLiked, setUserHasLiked] = useState(initialUserHasLiked)
  const [isLoading, setIsLoading] = useState(false)
  const { colors } = useTheme()
  const router = useRouter()

  const handleLike = async () => {
    if (!isAuthenticated) {
      // Redirect to login
      router.push('/login?redirect=' + encodeURIComponent(router.asPath))
      return
    }

    if (isLoading) return

    // Optimistic update
    const previousLiked = userHasLiked
    const previousCount = likeCount
    setUserHasLiked(!userHasLiked)
    setLikeCount(userHasLiked ? likeCount - 1 : likeCount + 1)
    setIsLoading(true)

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle like')
      }

      const data = await response.json()
      setLikeCount(data.likeCount)
      setUserHasLiked(data.userHasLiked)
    } catch (error) {
      console.error('Error toggling like:', error)
      // Revert optimistic update
      setUserHasLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: userHasLiked ? colors.primary : colors.inputBackground,
        color: userHasLiked ? '#fff' : colors.text,
        border: `1px solid ${userHasLiked ? colors.primary : colors.border}`,
        borderRadius: '8px',
        cursor: isLoading ? 'wait' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        opacity: isLoading ? 0.7 : 1
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.transform = 'scale(1.05)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      title={isAuthenticated ? (userHasLiked ? 'Unlike' : 'Like') : 'Login to like'}
    >
      <span style={{ fontSize: '18px' }}>
        {userHasLiked ? '❤️' : '🤍'}
      </span>
      <span>{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
    </button>
  )
}
