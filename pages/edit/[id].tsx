import { GetServerSideProps } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../../lib/auth'
import { getFileById } from '../../lib/dbSchema'
import { useTheme } from '../../lib/ThemeContext'
import { useAppPaths } from '../../lib/appPaths'
import MarkdownEditor from '../../components/MarkdownEditor'
import FolderSelect from '../../components/FolderSelect'
import { alertMessage } from '../../lib/swal'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id as string
  const session = await auth.api.getSession({ headers: context.req.headers as any })
  const userId = session?.user?.id

  if (!userId) {
    return {
      redirect: { destination: `/login?redirect=${encodeURIComponent(`/edit/${id}`)}`, permanent: false }
    }
  }

  const file = await getFileById(id)
  if (!file || file.user_id !== userId) {
    return { notFound: true }
  }

  const response = await fetch(file.cloudinary_url)
  const content = await response.text()

  return {
    props: {
      fileId: id,
      content,
      title: file.title,
      author: file.author || '',
      isPublic: !!file.is_public,
      folderId: file.folder_id || null,
    }
  }
}

export default function EditPage({
  fileId,
  content,
  title: initialTitle,
  author: initialAuthor,
  isPublic: initialPublic,
  folderId: initialFolderId,
}: {
  fileId: string
  content: string
  title: string
  author: string
  isPublic: boolean
  folderId: string | null
}) {
  const { colors } = useTheme()
  const { apiPath, sitePath } = useAppPaths()
  const router = useRouter()
  const [text, setText] = useState(content)
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor)
  const [showAuthor, setShowAuthor] = useState(!!initialAuthor)
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [folderId, setFolderId] = useState<string | null>(initialFolderId)
  const [saving, setSaving] = useState(false)
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free')

  useEffect(() => {
    fetch(apiPath('/profile'))
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.plan === 'pro') setUserPlan('pro')
      })
      .catch(() => {})
  }, [apiPath])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(apiPath(`/files/${fileId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: text,
          author: showAuthor ? author : '',
          isPublic,
          hashtags,
          folderId,
        }),
      })
      if (!res.ok) {
        await alertMessage({ text: 'Failed to save changes', icon: 'error' })
        return
      }
      router.push(sitePath(`/file/${fileId}`))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell composer" style={{ color: colors.text }}>
      <h1 className="page-title">Edit document</h1>
      <MarkdownEditor
        text={text}
        title={title}
        author={author}
        showAuthor={showAuthor}
        isPublic={isPublic}
        hashtags={hashtags}
        onTextChange={setText}
        onTitleChange={setTitle}
        onAuthorChange={setAuthor}
        onShowAuthorChange={setShowAuthor}
        onIsPublicChange={setIsPublic}
        onHashtagsChange={setHashtags}
        userPlan={userPlan}
      />
      <FolderSelect activeFolderId={folderId} onChange={setFolderId} />
      <div className="share-row">
        <button className="header-btn primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
