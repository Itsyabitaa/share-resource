import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '../lib/ThemeContext'
import Header from '../components/Header'

interface FileData {
  id: string
  title: string
  author?: string
  file_type: string
  file_size?: number
  hashtags?: string[]
  created_at: string
  like_count?: number
  comment_count?: number
}

interface HashtagData {
  hashtag: string
  count: number
}

export default function Explore() {
  const [files, setFiles] = useState<FileData[]>([])
  const [hashtags, setHashtags] = useState<HashtagData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedHashtag, setSelectedHashtag] = useState('')
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const router = useRouter()
  const { colors } = useTheme()

  useEffect(() => {
    loadData()
  }, [searchTerm, selectedHashtag])

  const loadData = async () => {
    setLoading(true)
    setDbError(null)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedHashtag) params.append('hashtag', selectedHashtag)

      const response = await fetch(`/api/explore?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details || data.error || 'Failed to fetch data'
        setDbError(errorMessage)
        // Don't throw error, just set empty data
        setFiles([])
        setHashtags([])
        return
      }

      setFiles(data.files || [])
      setHashtags(data.hashtags || [])
    } catch (error) {
      console.error('Error loading data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      setDbError(errorMessage)
      // Set empty arrays to show appropriate empty state
      setFiles([])
      setHashtags([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = (fileId: string) => {
    router.push(`/file/${fileId}`)
  }

  const handleHashtagClick = (hashtag: string) => {
    setSelectedHashtag(selectedHashtag === hashtag ? '' : hashtag)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: 20,
      backgroundColor: colors.background,
      color: colors.text,
      minHeight: '100vh',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      <Header />

      <div style={{ marginBottom: 30 }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '10px',
          color: colors.text
        }}>
          Explore Public Documents
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: colors.secondary,
          marginBottom: '30px'
        }}>
          Discover and read markdown documents shared by the community
        </p>
      </div>

      {/* Search and Filter Section */}
      <div style={{
        marginBottom: 30,
        padding: '20px',
        backgroundColor: colors.inputBackground,
        borderRadius: '10px',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search documents by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              backgroundColor: colors.background,
              color: colors.text,
              outline: 'none'
            }}
          />
        </div>

        {/* Popular Hashtags */}
        <div>
          <h3 style={{
            marginBottom: '15px',
            color: colors.text,
            fontSize: '1.1rem'
          }}>
            Popular Topics
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {hashtags.map((tag) => (
              <button
                key={tag.hashtag}
                onClick={() => handleHashtagClick(tag.hashtag)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  backgroundColor: selectedHashtag === tag.hashtag
                    ? colors.primary
                    : colors.border,
                  color: selectedHashtag === tag.hashtag
                    ? '#fff'
                    : colors.text,
                  transition: 'all 0.2s ease'
                }}
              >
                #{tag.hashtag} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: colors.secondary
          }}>
            Loading...
          </div>
        ) : files.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: colors.secondary
          }}>
            {searchTerm || selectedHashtag
              ? 'No documents found matching your criteria.'
              : 'No public documents available yet.'
            }
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file.id)}
                style={{
                  padding: '20px',
                  backgroundColor: colors.inputBackground,
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.primary
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <h3 style={{
                  marginBottom: '10px',
                  fontSize: '1.2rem',
                  color: colors.text
                }}>
                  {file.title}
                </h3>

                <div style={{
                  marginBottom: '15px',
                  fontSize: '0.9rem',
                  color: colors.secondary
                }}>
                  {file.author && (
                    <div style={{ marginBottom: '5px' }}>
                      By: {file.author}
                    </div>
                  )}
                  <div style={{ marginBottom: '5px' }}>
                    Type: {file.file_type.toUpperCase()}
                  </div>
                  {file.file_size && (
                    <div style={{ marginBottom: '5px' }}>
                      Size: {formatFileSize(file.file_size)}
                    </div>
                  )}
                  <div>
                    Created: {formatDate(file.created_at)}
                  </div>
                </div>

                {/* Social Stats */}
                <div style={{
                  display: 'flex',
                  gap: '15px',
                  marginBottom: '15px',
                  fontSize: '0.9rem',
                  color: colors.secondary
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ❤️ {file.like_count || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    💬 {file.comment_count || 0}
                  </div>
                </div>

                {file.hashtags && file.hashtags.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '5px'
                  }}>
                    {file.hashtags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: colors.border,
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          color: colors.secondary
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
