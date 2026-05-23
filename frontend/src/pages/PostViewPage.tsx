import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPost } from '../services/api'
import NavBar from '../components/NavBar'

export default function PostViewPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postId) return
    getPost(Number(postId))
      .then(p => {
        if (p.status !== 'published') { navigate('/blog'); return }
        setTitle(p.title)
        setContent(p.content)
        setPublishedAt(p.published_at)
      })
      .catch(() => navigate('/blog'))
      .finally(() => setLoading(false))
  }, [postId, navigate])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <NavBar />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar />
      <article style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* Back */}
        <button
          onClick={() => navigate('/blog')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, padding: 0, marginBottom: 40,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← My Blog
        </button>

        {/* Meta */}
        {publishedAt && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {new Date(publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}

        {/* Title */}
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', lineHeight: 1.35, letterSpacing: '-0.5px', marginBottom: 32 }}>
          {title}
        </h1>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 36 }} />

        {/* Content */}
        <div style={{
          fontSize: 16, lineHeight: 1.85, color: 'var(--text)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
        }}>
          {content || <span style={{ color: 'var(--text-muted)' }}>내용이 없습니다.</span>}
        </div>
      </article>
    </div>
  )
}
