import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPosts, deletePost, updatePost, type Post } from '../services/api'
import NewPostModal from '../components/post/NewPostModal'
import NavBar from '../components/NavBar'

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
]

function PostCard({ post, onDelete, onEdit, onPublish }: { post: Post; onDelete: () => void; onEdit: () => void; onPublish: () => void }) {
  const gradient = CARD_GRADIENTS[post.id % CARD_GRADIENTS.length]

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.15s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Cover */}
      <div style={{ height: 120, background: gradient, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            background: 'rgba(255,255,255,0.25)', color: '#fff', backdropFilter: 'blur(4px)',
          }}>
            {post.status === 'published' ? '발행됨' : '초안'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
            {new Date(post.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
          {post.title || '제목 없음'}
        </h2>
        {post.content && (
          <p style={{
            color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, flex: 1,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}>
            {post.content.slice(0, 150)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 500,
            background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
        >
          수정하기
        </button>
        <button
          onClick={onPublish}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 500,
            background: post.status === 'published' ? '#dcfce7' : 'var(--accent)',
            border: '1px solid ' + (post.status === 'published' ? '#86efac' : 'var(--accent)'),
            color: post.status === 'published' ? 'var(--success)' : '#fff',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {post.status === 'published' ? '발행됨 ✓' : '발행하기'}
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          삭제
        </button>
      </div>
    </div>
  )
}

function NewPostCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: '2px dashed var(--border)', borderRadius: 12, minHeight: 240,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, cursor: 'pointer', color: 'var(--text-muted)',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 500 }}>새 포스트 작성</p>
        <p style={{ fontSize: 12, marginTop: 3 }}>AI와 함께 글을 써보세요</p>
      </div>
    </div>
  )
}

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

  async function handleDelete(postId: number) {
    if (!confirm('이 포스트를 삭제할까요?')) return
    await deletePost(postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    localStorage.removeItem(`chat_${postId}`)
  }

  async function handlePublish(post: Post) {
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    const updated = await updatePost(post.id, { status: newStatus })
    setPosts(prev => prev.map(p => p.id === post.id ? updated : p))
  }

  function handleCreated(postId: number) {
    navigate(`/post/${postId}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
    <NavBar />
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>내 블로그</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 5 }}>AI 에이전트와 함께 작성하세요</p>
        </div>
        <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600 }} onClick={() => setShowModal(true)}>
          + 새 포스트
        </button>
      </header>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: 'var(--danger)', fontSize: 13 }}>
          백엔드 연결 실패: {error}
        </div>
      )}

      {/* Card Grid */}
      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={() => navigate(`/post/${post.id}`)}
              onDelete={() => handleDelete(post.id)}
              onPublish={() => handlePublish(post)}
            />
          ))}
          <NewPostCard onClick={() => setShowModal(true)} />
        </div>
      )}

      {showModal && (
        <NewPostModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
    </div>
  )
}
