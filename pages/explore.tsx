import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'

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
    <PageContainer>
      <Navbar />

      <div style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
        <h1
          style={{
            fontSize: 'var(--font-3xl)',
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-text)'
          }}
        >
          Explore Public Documents
        </h1>
        <p
          style={{
            fontSize: 'var(--font-base)',
            color: 'var(--color-text-muted)'
          }}
        >
          Discover and read markdown documents shared by the community
        </p>
      </div>

      {/* Search and Filter Section */}
      <Card style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Input
            type="text"
            placeholder="Search documents by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* Popular Hashtags */}
        <div>
          <h3
            style={{
              marginBottom: 'var(--space-3)',
              color: 'var(--color-text)',
              fontSize: 'var(--font-sm)',
              fontWeight: 'var(--weight-bold)'
            }}
          >
            Popular Topics
          </h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-2)'
            }}
          >
            {hashtags.map((tag) => (
              <Badge
                key={tag.hashtag}
                variant={selectedHashtag === tag.hashtag ? 'accent' : 'default'}
                onClick={() => handleHashtagClick(tag.hashtag)}
              >
                #{tag.hashtag} ({tag.count})
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Results Section */}
      <div>
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-10)',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-base)'
            }}
          >
            Loading...
          </div>
        ) : files.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-10)',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-base)'
            }}
          >
            {searchTerm || selectedHashtag
              ? 'No documents found matching your criteria.'
              : 'No public documents available yet.'}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--space-6)'
            }}
          >
            {files.map((file) => (
              <Card
                key={file.id}
                hoverable
                onClick={() => handleFileClick(file.id)}
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <h3
                  style={{
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--font-lg)',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--color-text)'
                  }}
                >
                  {file.title}
                </h3>

                <div
                  style={{
                    marginBottom: 'var(--space-4)',
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-text-muted)',
                    flex: 1
                  }}
                >
                  {file.author && (
                    <div style={{ marginBottom: '4px' }}>
                      By: <strong>{file.author}</strong>
                    </div>
                  )}
                  <div style={{ marginBottom: '4px' }}>
                    Type: {file.file_type.toUpperCase()}
                  </div>
                  {file.file_size && (
                    <div style={{ marginBottom: '4px' }}>
                      Size: {formatFileSize(file.file_size)}
                    </div>
                  )}
                  <div>
                    Created: {formatDate(file.created_at)}
                  </div>
                </div>

                {/* Social Stats & Hashtags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-4)',
                      fontSize: 'var(--font-sm)',
                      color: 'var(--color-text-muted)',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: 'var(--space-3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      ❤️ {file.like_count || 0}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      💬 {file.comment_count || 0}
                    </div>
                  </div>

                  {file.hashtags && file.hashtags.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-1)'
                      }}
                    >
                      {file.hashtags.map((tag) => (
                        <Badge key={tag} variant="outline" style={{ pointerEvents: 'none' }}>
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
