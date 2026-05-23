const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const listPosts = (): Promise<Post[]> => request('/api/posts/')

export const createPost = (title: string): Promise<Post> =>
  request('/api/posts/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })

export const getPost = (id: number): Promise<Post> => request(`/api/posts/${id}`)

export const updatePost = (id: number, data: { title?: string; content?: string }): Promise<Post> =>
  request(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export interface ChatEvent {
  type: 'token' | 'edit_suggestion' | 'done'
  content?: string
}

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function* streamChat(
  sessionId: number,
  message: string,
  postContent: string,
  history: HistoryMessage[],
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE}/api/chat/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      post_content: postContent,
      repo_contexts: [],
      history,
    }),
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
