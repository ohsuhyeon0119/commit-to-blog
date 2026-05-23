import { useState, useEffect } from 'react'
import { listGithubRepos, registerRepo, cloneRepo, createPost, linkPostRepo, type GithubRepoItem } from '../../services/api'

interface Props {
  onClose: () => void
  onCreated: (postId: number) => void
}

export default function NewPostModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [repos, setRepos] = useState<GithubRepoItem[]>([])
  const [repoQuery, setRepoQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GithubRepoItem | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<'form' | 'cloning'>('form')

  const filteredRepos = repoQuery.trim()
    ? repos.filter(r => r.full_name.toLowerCase().includes(repoQuery.toLowerCase()))
    : repos

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
      background: 'rgba(15,23,42,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, width: 500, maxWidth: '90vw',
        boxShadow: 'var(--shadow)',
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>새 포스트 작성</h2>

        {step === 'cloning' ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: 16 }}>
              <span /><span /><span />
            </div>
            <p style={{ fontWeight: 500, color: 'var(--text)' }}>레포를 가져오는 중입니다...</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>에디터로 이동합니다.</p>
          </div>
        ) : (
          <>
            {/* 제목 */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 7 }}>제목</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="포스트 제목을 입력하세요"
                autoFocus
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* 레포 선택 */}
            <div style={{ marginBottom: 26 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 7 }}>
                GitHub 레포 연결
              </label>

              {loadingRepos && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>레포 목록 로딩 중...</p>}
              {repoError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>레포 로드 실패: {repoError}</p>}

              {!loadingRepos && !repoError && (
                <>
                  <input
                    value={repoQuery}
                    onChange={e => setRepoQuery(e.target.value)}
                    placeholder="레포 이름 검색..."
                    style={{
                      width: '100%', padding: '8px 11px', borderRadius: 7, marginBottom: 7,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: 13, outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                <div style={{ maxHeight: 210, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)' }}>
                  {filteredRepos.length === 0 && (
                    <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>일치하는 레포가 없습니다.</p>
                  )}
                  {filteredRepos.map(repo => (

                    <div
                      key={repo.github_repo_id}
                      onClick={() => setSelectedRepo(repo)}
                      style={{
                        padding: '11px 15px', cursor: 'pointer',
                        background: selectedRepo?.github_repo_id === repo.github_repo_id
                          ? 'var(--accent-light)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                        borderLeft: selectedRepo?.github_repo_id === repo.github_repo_id
                          ? '3px solid var(--accent)' : '3px solid transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{repo.full_name}</span>
                        {repo.description && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 300 }}>
                            {repo.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 10 }}>
                        {repo.private && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Private
                          </span>
                        )}
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          {repo.default_branch}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={onClose}>취소</button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!title.trim() || !selectedRepo || creating}
                style={{ fontWeight: 500 }}
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
