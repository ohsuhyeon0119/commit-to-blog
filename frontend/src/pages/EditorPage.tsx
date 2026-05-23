import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPost, updatePost, streamChat, type HistoryMessage } from '../services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  pendingEdit?: string
}

const TEMP_SESSION_ID = 1

export default function EditorPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!postId) return
    getPost(Number(postId))
      .then(post => { setTitle(post.title); setContent(post.content) })
      .catch(() => navigate('/'))
  }, [postId, navigate])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const scheduleSave = useCallback((newContent: string) => {
    setSaveState('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!postId) return
      setSaveState('saving')
      try {
        await updatePost(Number(postId), { content: newContent })
        setSaveState('saved')
      } catch {
        setSaveState('unsaved')
      }
    }, 1200)
  }, [postId])

  function handleContentChange(val: string) {
    setContent(val)
    scheduleSave(val)
  }

  async function handleTitleBlur() {
    if (!postId || !title.trim()) return
    await updatePost(Number(postId), { title }).catch(() => {})
  }

  function applyEdit(newContent: string) {
    setContent(newContent)
    scheduleSave(newContent)
    setMessages(prev => prev.map(m => ({ ...m, pendingEdit: undefined })))
  }

  async function handleSend() {
    if (!input.trim() || streaming) return
    const userMsg = input.trim()
    setInput('')

    const history: HistoryMessage[] = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }])
    setStreaming(true)

    let assistantContent = ''
    let pendingEdit: string | undefined

    try {
      for await (const event of streamChat(TEMP_SESSION_ID, userMsg, content, history)) {
        if (event.type === 'token' && event.content) {
          assistantContent += event.content
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: assistantContent }
            return next
          })
        } else if (event.type === 'edit_suggestion' && event.content) {
          pendingEdit = event.content
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: assistantContent, pendingEdit }
            return next
          })
        }
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: `오류: ${(e as Error).message}` }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  const saveLabel = saveState === 'saving' ? '저장 중...' : saveState === 'unsaved' ? '저장 안됨' : '저장됨'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 52,
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => navigate('/')}>
          ← 목록
        </button>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="제목 없음"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 15, fontWeight: 600,
          }}
        />
        <span style={{ fontSize: 12, color: saveState === 'unsaved' ? 'var(--danger)' : 'var(--text-muted)', flexShrink: 0 }}>
          {saveLabel}
        </span>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Markdown Editor */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder={'마크다운으로 작성하세요...\n\n# 제목\n\n내용을 입력하면 자동 저장됩니다.'}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'var(--bg)', color: 'var(--text)',
            fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
            fontSize: 14, lineHeight: 1.8,
            padding: '28px 40px',
            borderRight: '1px solid var(--border)',
          }}
        />

        {/* Chat Panel */}
        <div style={{ width: 360, display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden', flexShrink: 0 }}>
          {/* Chat Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>AI 어시스턴트</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 24, marginBottom: 10 }}>✦</p>
                <p style={{ fontSize: 13 }}>에이전트에게 질문하거나</p>
                <p style={{ fontSize: 13 }}>글 수정을 요청해보세요.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>
                  {msg.role === 'user' ? '나' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '88%', padding: '9px 12px', borderRadius: 8,
                  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                  color: 'var(--text)',
                }}>
                  {msg.content || (streaming && i === messages.length - 1
                    ? <span style={{ color: 'var(--text-muted)' }}>▍</span>
                    : null
                  )}
                </div>
                {msg.pendingEdit && (
                  <button
                    className="btn-primary"
                    onClick={() => applyEdit(msg.pendingEdit!)}
                    style={{ fontSize: 12, padding: '5px 12px', alignSelf: 'flex-start' }}
                  >
                    수정안 에디터에 적용
                  </button>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              disabled={streaming}
              rows={2}
              placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
              style={{
                flex: 1, resize: 'none', borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)',
                padding: '8px 10px', fontSize: 13, lineHeight: 1.5, outline: 'none',
              }}
            />
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              style={{ padding: '8px 14px', alignSelf: 'flex-end', flexShrink: 0 }}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
