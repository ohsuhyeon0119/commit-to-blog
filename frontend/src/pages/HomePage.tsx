import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPosts, type Post } from '../services/api'
import NewPostModal from '../components/post/NewPostModal'

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(postId: number) {
    navigate(`/post/${postId}`)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>내 블로그</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>AI 에이전트와 함께 작성하세요</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + 새 포스트
        </button>
      </header>

      {loading && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0' }}>불러오는 중...</p>
      )}
      {error && (
        <div style={{ background: '#1c1010', border: '1px solid #3d1515', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 13 }}>
          백엔드 연결 실패: {error}
        </div>
      )}
      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✏️</p>
          <p>아직 포스트가 없습니다.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>새 포스트를 만들어 AI와 함께 작성해보세요.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {posts.map(post => (
          <div
            key={post.id}
            onClick={() => navigate(`/post/${post.id}`)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '16px 20px', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>{post.title}</h2>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4, flexShrink: 0, marginLeft: 12,
                background: post.status === 'published' ? '#14532d' : 'var(--surface-2)',
                color: post.status === 'published' ? '#4ade80' : 'var(--text-muted)',
              }}>
                {post.status === 'published' ? '발행됨' : '초안'}
              </span>
            </div>
            {post.content && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {post.content.slice(0, 120)}
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
              {new Date(post.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        ))}
      </div>

      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
