import { useState, useEffect } from 'react'
import { listGithubRepos, registerRepo, cloneRepo, createPost, linkPostRepo, type GithubRepoItem } from '../../services/api'

interface Props {
  onClose: () => void
  onCreated: (postId: number) => void
}

export default function NewPostModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [repos, setRepos] = useState<GithubRepoItem[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GithubRepoItem | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<'form' | 'cloning'>('form')

  useEffect(() => {
    listGithubRepos()
      .then(setRepos)
      .catch(e => setRepoError(e.message))
      .finally(() => setLoadingRepos(false))
  }, [])

  async function handleCreate() {
    if (!title.trim() || !selectedRepo || creating) return
    setCreating(true)
    try {
      // 1. 레포 DB 등록
      const repo = await registerRepo(selectedRepo)
      // 2. 포스트 생성
      const post = await createPost(title.trim())
      // 3. 포스트-레포 연결
      await linkPostRepo(post.id, repo.id, selectedRepo.default_branch)
      // 4. 백그라운드 clone 시작
      setStep('cloning')
      await cloneRepo(repo.id)
      onCreated(post.id)
    } catch (e) {
      alert('생성 실패: ' + (e as Error).message)
      setCreating(false)
      setStep('form')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>새 포스트 작성</h2>

        {step === 'cloning' ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 20, marginBottom: 12 }}>⚙️</p>
            <p>레포를 가져오는 중입니다...</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>에디터로 이동합니다.</p>
          </div>
        ) : (
          <>
            {/* 제목 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>제목</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="포스트 제목을 입력하세요"
                autoFocus
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            {/* 레포 선택 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                GitHub 레포 연결
              </label>

              {loadingRepos && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>레포 목록 로딩 중...</p>}
              {repoError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>레포 로드 실패: {repoError}</p>}

              {!loadingRepos && !repoError && (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                  {repos.map(repo => (
                    <div
                      key={repo.github_repo_id}
                      onClick={() => setSelectedRepo(repo)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        background: selectedRepo?.github_repo_id === repo.github_repo_id
                          ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{repo.full_name}</span>
                        {repo.description && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 340 }}>
                            {repo.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {repo.private && (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            Private
                          </span>
                        )}
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          {repo.default_branch}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={onClose}>취소</button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!title.trim() || !selectedRepo || creating}
              >
                {creating ? '생성 중...' : '글 작성 시작'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
