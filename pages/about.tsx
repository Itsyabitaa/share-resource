import Link from 'next/link'
import { useTheme } from '../lib/ThemeContext'
import { useAppPaths } from '../lib/appPaths'

export default function AboutPage() {
  const { colors } = useTheme()
  const { sitePath } = useAppPaths()

  return (
    <div className="page-shell" style={{ color: colors.text }}>
      <h1 className="page-title">About md-nest</h1>
      <p className="page-subtitle">A calm place to write, share, and keep markdown.</p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: '1.35rem',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${colors.border}`
        }}>
          What is md-nest?
        </h2>
        <p style={{ marginBottom: 12, opacity: 0.9 }}>
          md-nest is a markdown sharing platform. Write in the editor, upload a file, and get a link you can send to anyone.
        </p>
        <p style={{ opacity: 0.9 }}>
          Guests get a 3-day nest. Free accounts keep documents for 30 days with folders and a workspace.
          Pro accounts get permanent storage. See{' '}
          <Link href={sitePath('/pricing')} style={{ color: 'inherit', fontWeight: 600 }}>pricing</Link>
          {' '}for details.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: '1.35rem',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${colors.border}`
        }}>
          How to use it
        </h2>
        <div style={{
          padding: 20,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          border: `1px solid ${colors.border}`
        }}>
          <ol style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 10 }}>
              <strong>Create</strong> a document in the editor, or upload TXT, MD, DOC, or DOCX.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong>Add a title</strong>, optional author, and hashtags if you want it on Explore.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong>Share</strong> the generated md-nest link.
            </li>
            <li>
              <strong>Explore</strong> public documents from other writers.
            </li>
          </ol>
        </div>
      </section>

      <section>
        <h2 style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: '1.35rem',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${colors.border}`
        }}>
          Ownership
        </h2>
        <div style={{
          padding: 20,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ marginBottom: 12 }}>
            © {new Date().getFullYear()} md-nest. You keep the rights to content you publish.
          </p>
          <p>
            Share only what you have the right to share.
          </p>
        </div>
      </section>
    </div>
  )
}
