import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPost, updatePost, streamChat, getPostRepo, getCloneStatus,
  type HistoryMessage, type Repo,
} from '../services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  pendingEdit?: string
  pendingPartialEdit?: { text: string; start: number; end: number }
}

interface Selection {
  start: number
  end: number
  text: string
}

export default function EditorPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  const [repo, setRepo] = useState<Repo | null>(null)
  const [cloneStatus, setCloneStatus] = useState<'not_cloned' | 'cloning' | 'cloned' | 'error'>('not_cloned')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  // 드래그 선택
  const [selection, setSelection] = useState<Selection | null>(null)
  const [activeSelection, setActiveSelection] = useState<{ start: number; end: number } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clonePoller = useRef<ReturnType<typeof setInterval> | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // 포스트 + 레포 로드
  useEffect(() => {
    if (!postId) return
    getPost(Number(postId))
      .then(p => { setTitle(p.title); setContent(p.content) })
      .catch(() => navigate('/'))

    getPostRepo(Number(postId)).then(r => {
      if (!r) return
      setRepo(r)
      setCloneStatus(r.clone_status)
      if (r.clone_status === 'cloning') startClonePoller(r.id)
    })
  }, [postId, navigate])

  // 대화 기록 로드 (포스트별 localStorage)
  useEffect(() => {
    if (!postId) return
    const saved = localStorage.getItem(`chat_${postId}`)
    if (saved) {
      try { setMessages(JSON.parse(saved)) } catch {}
    }
  }, [postId])

  // 대화 기록 저장 (스트리밍 중엔 저장 안 함)
  useEffect(() => {
    if (!postId || messages.length === 0 || streaming) return
    localStorage.setItem(`chat_${postId}`, JSON.stringify(messages))
  }, [messages, postId, streaming])

  function startClonePoller(repoId: number) {
    if (clonePoller.current) return
    clonePoller.current = setInterval(async () => {
      const s = await getCloneStatus(repoId).catch(() => null)
      if (!s) return
      setCloneStatus(s.status as typeof cloneStatus)
      if (s.status === 'cloned' || s.status === 'error') {
        clearInterval(clonePoller.current!)
        clonePoller.current = null
        setRepo(prev => prev ? { ...prev, clone_path: s.clone_path, clone_status: s.status as Repo['clone_status'] } : prev)
      }
    }, 5000)
  }

  useEffect(() => () => { if (clonePoller.current) clearInterval(clonePoller.current) }, [])
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const scheduleSave = useCallback((val: string) => {
    setSaveState('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!postId) return
      setSaveState('saving')
      try { await updatePost(Number(postId), { content: val }); setSaveState('saved') }
      catch { setSaveState('unsaved') }
    }, 1200)
  }, [postId])

  function applyEdit(newContent: string) {
    setContent(newContent)
    scheduleSave(newContent)
    setMessages(prev => prev.map(m => ({ ...m, pendingEdit: undefined, pendingPartialEdit: undefined })))
    setActiveSelection(null)
  }

  function applyPartialEdit(newText: string, start: number, end: number) {
    const newContent = content.slice(0, start) + newText + content.slice(end)
    setContent(newContent)
    scheduleSave(newContent)
    setMessages(prev => prev.map(m => ({ ...m, pendingEdit: undefined, pendingPartialEdit: undefined })))
    setActiveSelection(null)
  }

  // 텍스트 선택 감지
  function handleTextareaSelect() {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart, selectionEnd } = el
    if (selectionStart !== selectionEnd) {
      setSelection({ start: selectionStart, end: selectionEnd, text: content.slice(selectionStart, selectionEnd) })
    } else {
      setSelection(null)
    }
  }

  // 선택 수정 요청 버튼 클릭
  function requestSelectionEdit() {
    if (!selection) return
    setActiveSelection({ start: selection.start, end: selection.end })
    chatInputRef.current?.focus()
    setSelection(null)
  }

  async function handleSend() {
    if (!input.trim() || streaming) return
    const userMsg = input.trim()
    setInput('')

    // activeSelection이 있으면 선택 부분을 컨텍스트로 주입 (수정/설명/피드백 등 자유롭게)
    const selectedText = activeSelection ? content.slice(activeSelection.start, activeSelection.end) : null
    const fullMessage = selectedText
      ? `[에디터에서 선택한 부분]\n"${selectedText}"\n\n${userMsg}`
      : userMsg

    const capturedSelection = activeSelection
    setActiveSelection(null)

    const history: HistoryMessage[] = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }])
    setStreaming(true)

    const repoContexts = repo && cloneStatus === 'cloned'
      ? [{ repo_id: repo.id, branch: 'main' }]
      : []

    let assistantContent = ''
    let pendingEdit: string | undefined
    let pendingPartialEdit: Message['pendingPartialEdit'] | undefined

    try {
      for await (const event of streamChat(Number(postId), fullMessage, content, history, repoContexts)) {
        if (event.type === 'token' && event.content) {
          assistantContent += event.content
          setMessages(prev => {
            const n = [...prev]
            n[n.length - 1] = { role: 'assistant', content: assistantContent, pendingEdit, pendingPartialEdit }
            return n
          })
        } else if (event.type === 'edit_suggestion' && event.content) {
          pendingEdit = event.content
          setMessages(prev => {
            const n = [...prev]
            n[n.length - 1] = { role: 'assistant', content: assistantContent, pendingEdit, pendingPartialEdit }
            return n
          })
        } else if (event.type === 'partial_edit_suggestion' && event.content && capturedSelection) {
          pendingPartialEdit = { text: event.content, start: capturedSelection.start, end: capturedSelection.end }
          setMessages(prev => {
            const n = [...prev]
            n[n.length - 1] = { role: 'assistant', content: assistantContent, pendingEdit, pendingPartialEdit }
            return n
          })
        }
      }
    } catch (e) {
      setMessages(prev => {
        const n = [...prev]
        n[n.length - 1] = { role: 'assistant', content: `오류: ${(e as Error).message}` }
        return n
      })
    } finally {
      setStreaming(false)
    }
  }

  const cloneColor = cloneStatus === 'cloned' ? 'var(--success)' : cloneStatus === 'cloning' ? 'var(--warning)' : 'var(--text-muted)'
  const saveLabel = saveState === 'saving' ? '저장 중...' : saveState === 'unsaved' ? '저장 안됨' : '저장됨'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 54,
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        background: 'var(--surface)', boxShadow: '0 1px 0 var(--border)',
      }}>
        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => navigate('/')}>← 목록</button>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => postId && updatePost(Number(postId), { title }).catch(() => {})}
          placeholder="제목 없음"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, fontWeight: 600 }}
        />
        {repo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
            borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cloneColor, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{repo.full_name}</span>
            <span style={{ color: cloneColor, fontSize: 11 }}>
              {cloneStatus === 'cloned' ? '탐색 가능' : cloneStatus === 'cloning' ? 'clone 중...' : '미준비'}
            </span>
          </div>
        )}
        <span style={{ fontSize: 12, color: saveState === 'unsaved' ? 'var(--danger)' : 'var(--text-muted)', flexShrink: 0 }}>{saveLabel}</span>
      </header>

      {/* 선택 텍스트 수정 요청 툴바 */}
      {selection && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 20px',
          background: 'var(--accent-light)', borderBottom: '1px solid var(--border)',
          fontSize: 12, flexShrink: 0,
        }}>
          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
            선택됨: <em style={{ color: 'var(--text)' }}>"{selection.text.slice(0, 60)}{selection.text.length > 60 ? '...' : ''}"</em>
          </span>
          <button
            onClick={requestSelectionEdit}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}
          >
            이 부분에 대해 묻기 →
          </button>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Markdown Editor */}
        <div style={{ flex: 1, position: 'relative', borderRight: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg)' }}>
          {/* 선택 영역 하이라이트 오버레이 */}
          {activeSelection && (
            <div
              ref={overlayRef}
              aria-hidden
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                fontSize: 14, lineHeight: 1.9, padding: '32px 48px',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
                color: 'transparent', overflow: 'hidden',
                zIndex: 1,
              }}
            >
              {content.slice(0, activeSelection.start)}
              <mark style={{
                background: 'rgba(37,99,235,0.15)',
                borderRadius: 3,
                color: 'transparent',
                outline: '1.5px solid rgba(37,99,235,0.4)',
              }}>
                {content.slice(activeSelection.start, activeSelection.end)}
              </mark>
              {content.slice(activeSelection.end)}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); scheduleSave(e.target.value) }}
            onMouseUp={handleTextareaSelect}
            onKeyUp={handleTextareaSelect}
            onScroll={() => {
              if (overlayRef.current && textareaRef.current) {
                overlayRef.current.scrollTop = textareaRef.current.scrollTop
              }
            }}
            placeholder={'마크다운으로 작성하세요...\n\n# 제목\n\n내용을 입력하면 자동 저장됩니다.'}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--text)',
              fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
              fontSize: 14, lineHeight: 1.9, padding: '32px 48px',
              zIndex: 2,
            }}
          />
        </div>

        {/* Chat Panel */}
        <div style={{ width: 360, display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden', flexShrink: 0 }}>
          {/* Chat Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>AI 어시스턴트</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {repo && cloneStatus === 'cloned' && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 500 }}>레포 탐색 가능</span>}
              {repo && cloneStatus === 'cloning' && <span style={{ fontSize: 11, color: 'var(--warning)' }}>레포 준비 중...</span>}
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); if (postId) localStorage.removeItem(`chat_${postId}`) }}
                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 18 }}>✦</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>AI 글쓰기 어시스턴트</p>
                <p style={{ fontSize: 13 }}>질문하거나 글 수정을 요청해보세요.</p>
                <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>텍스트를 드래그해 부분 수정도 가능해요.</p>
                {repo && cloneStatus === 'cloned' && (
                  <p style={{ fontSize: 12, marginTop: 10, color: 'var(--success)', fontWeight: 500 }}>{repo.name} 레포 탐색 가능</p>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px', fontWeight: 500 }}>
                  {msg.role === 'user' ? '나' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '90%', padding: '10px 13px', borderRadius: 10,
                  fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {streaming && i === messages.length - 1 && !msg.content && !msg.pendingEdit && !msg.pendingPartialEdit
                    ? <div className="loading-dots"><span /><span /><span /></div>
                    : msg.content || null}
                </div>
                {msg.pendingEdit && (
                  <button className="btn-primary" onClick={() => applyEdit(msg.pendingEdit!)}
                    style={{ fontSize: 12, padding: '6px 14px', alignSelf: 'flex-start', marginTop: 2 }}>
                    ✓ 전체 수정안 적용
                  </button>
                )}
                {msg.pendingPartialEdit && (
                  <button className="btn-primary"
                    onClick={() => applyPartialEdit(msg.pendingPartialEdit!.text, msg.pendingPartialEdit!.start, msg.pendingPartialEdit!.end)}
                    style={{ fontSize: 12, padding: '6px 14px', alignSelf: 'flex-start', marginTop: 2 }}>
                    ✓ 선택 부분만 적용
                  </button>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            {/* 선택 컨텍스트 칩 */}
            {activeSelection && (
              <div style={{ padding: '8px 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--accent-light)', border: '1px solid var(--accent)',
                  borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--accent)',
                  maxWidth: '100%', overflow: 'hidden',
                }}>
                  <span style={{ flexShrink: 0 }}>✂</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 500 }}>
                    "{content.slice(activeSelection.start, activeSelection.end).slice(0, 60)}{content.slice(activeSelection.start, activeSelection.end).length > 60 ? '...' : ''}"
                  </span>
                  <button
                    onClick={() => setActiveSelection(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '0 2px', fontSize: 13, lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
              </div>
            )}
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={chatInputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              disabled={streaming}
              rows={2}
              placeholder="메시지 입력 (Enter 전송)"
              style={{
                flex: 1, resize: 'none', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)',
                padding: '9px 11px', fontSize: 13, lineHeight: 1.5, outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button className="btn-primary" onClick={handleSend} disabled={streaming || !input.trim()}
              style={{ padding: '9px 16px', alignSelf: 'flex-end', flexShrink: 0, fontWeight: 500 }}>
              전송
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
