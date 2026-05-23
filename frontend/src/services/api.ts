const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────

export interface Post {
  id: number
  user_id: number
  title: string
  content: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface Repo {
  id: number
  user_id: number
  github_repo_id: string
  owner: string
  name: string
  full_name: string
  clone_path: string | null
  cloned_at: string | null
  clone_status: 'not_cloned' | 'cloning' | 'cloned' | 'error'
}

export interface GithubRepoItem {
  github_repo_id: string
  owner: string
  name: string
  full_name: string
  description: string | null
  private: boolean
  default_branch: string
}

export interface CloneStatus {
  repo_id: number
  status: 'cloning' | 'cloned' | 'error'
  clone_path: string | null
  message: string | null
}

export interface ChatEvent {
  type: 'token' | 'edit_suggestion' | 'done'
  content?: string
}

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

// ── Helpers ───────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

// ── Posts ─────────────────────────────────────────────

export const listPosts = (): Promise<Post[]> => request('/api/posts/')

export const createPost = (title: string): Promise<Post> =>
  request('/api/posts/', json({ title }))

export const getPost = (id: number): Promise<Post> => request(`/api/posts/${id}`)

export const updatePost = (id: number, data: { title?: string; content?: string }): Promise<Post> =>
  request(`/api/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

export const getPostRepo = (postId: number): Promise<Repo | null> =>
  request<Repo | null>(`/api/posts/${postId}/repo`)

export const linkPostRepo = (postId: number, repoId: number, branch = 'main'): Promise<Repo> =>
  request(`/api/posts/${postId}/repo`, json({ repo_id: repoId, branch }))

// ── Repos ─────────────────────────────────────────────

export const listGithubRepos = (): Promise<GithubRepoItem[]> => request('/api/repos/github')

export const listRepos = (): Promise<Repo[]> => request('/api/repos/')

export const registerRepo = (item: GithubRepoItem): Promise<Repo> =>
  request('/api/repos/', json({
    github_repo_id: item.github_repo_id,
    owner: item.owner,
    name: item.name,
    full_name: item.full_name,
  }))

export const cloneRepo = (repoId: number): Promise<CloneStatus> =>
  request(`/api/repos/${repoId}/clone`, { method: 'POST' })

export const getCloneStatus = (repoId: number): Promise<CloneStatus> =>
  request(`/api/repos/${repoId}/clone-status`)

// ── Chat ─────────────────────────────────────────────

export async function* streamChat(
  sessionId: number,
  message: string,
  postContent: string,
  history: HistoryMessage[],
  repoContexts: { repo_id: number; branch: string }[] = [],
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE}/api/chat/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, post_content: postContent, repo_contexts: repoContexts, history }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = line.slice(6).trim()
        if (json) yield JSON.parse(json) as ChatEvent
      }
    }
  }
}
