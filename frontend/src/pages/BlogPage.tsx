import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPosts, type Post } from '../services/api'
import NavBar from '../components/NavBar'

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    listPosts()
      .then(all => setPosts(all.filter(p => p.status === 'published')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <header style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>My Blog</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 5 }}>발행된 포스트 목록입니다.</p>
        </header>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="loading-dots"><span /><span /><span /></div>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 32, marginBottom: 14 }}>📝</p>
            <p style={{ fontWeight: 500 }}>발행된 포스트가 없습니다.</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Saved Posts에서 글을 발행해보세요.</p>
            <button
              className="btn-primary"
              style={{ marginTop: 20, padding: '8px 18px' }}
              onClick={() => navigate('/')}
            >
              Saved Posts로 이동
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {posts.map((post, i) => (
            <div
              key={post.id}
              onClick={() => navigate(`/blog/${post.id}`)}
              style={{
                padding: '18px 4px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.querySelector('h2')!.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.querySelector('h2')!.style.color = 'var(--text)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', transition: 'color 0.1s' }}>
                    {post.title || '제목 없음'}
                  </h2>
                </div>
                {post.content && (
                  <p style={{
                    color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    paddingLeft: 28,
                  }}>
                    {post.content.slice(0, 100)}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                {new Date(post.published_at ?? post.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
