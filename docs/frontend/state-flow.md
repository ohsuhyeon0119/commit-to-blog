# 상태 흐름

## 전역 상태 구조

### postState
```ts
{
  id: number
  title: string
  content: string        // 에디터 마크다운 내용
  status: 'draft' | 'published'
}
```

### repoState
```ts
{
  // 이 포스트에 연결된 레포 (1개 — 포스트 생성 시 선택)
  repo: {
    id: number
    owner: string
    name: string
    full_name: string
    clone_path: string | null  // 서버에 클론됐으면 존재
  } | null
  selectedBranch: string       // 기본값 "main"
}
```

### chatState
```ts
{
  messages: Message[]
  isStreaming: boolean
  pendingEdit: string | null   // 에이전트 수정 제안 (적용 대기)
}
```

## 핵심 플로우

### 1. 새 포스트 생성
```
"새 글 작성" 버튼 클릭
  → NewPostModal 표시
       ├── 제목 입력
       └── GitHub 레포 선택 (GET /api/repos/github)
  → "생성" 클릭
       ├── POST /api/repos/ (레포 DB 등록, 없으면)
       ├── POST /api/posts/ (포스트 생성 + repo 연결)
       └── POST /api/repos/{id}/clone (백그라운드)
  → /post/:id 로 이동
```

### 2. 에디터 진입 시 레포 정보 로드
```
EditorPage mount
  ├── GET /api/posts/{id}            포스트 내용
  └── GET /api/posts/{id}/repo       연결된 레포 정보
       → repoState 설정
       → RepoInfoPanel에 표시 (이름, 브랜치, clone 상태)
```

### 3. 챗 전송
```
ChatInput → 전송
  → payload:
       message: 사용자 입력
       post_content: 현재 에디터 내용 (스냅샷)
       repo_contexts: [{ repo_id, branch }]  ← 연결된 레포
       history: 이전 메시지 목록
  → SSE 스트리밍
       token        → chatState.messages에 실시간 append
       edit_suggestion → chatState.pendingEdit 저장
       done         → isStreaming = false
```

### 4. 수정 제안 적용
```
"수정안 적용" 버튼 클릭
  → postState.content 전체 교체
  → chatState.pendingEdit 초기화
  → 자동저장 사이클 트리거 (1.2s debounce → PATCH /api/posts/{id})
```

### 5. 에이전트 레포 탐색 (내부)
```
에이전트가 레포 정보 필요 시
  → list_directory(clone_path, subpath) 도구 호출
  → read_file(clone_path, file_path) 도구 호출
  → search_in_repo(clone_path, query) 도구 호출
  → 결과를 컨텍스트로 사용해 답변 생성
```

## 데이터 흐름 다이어그램

```
NewPostModal
  GitHub 레포 선택 ──────────────→ repoState
                                       │
EditorPage mount ──→ GET /api/posts/{id}
                 └─→ GET /api/posts/{id}/repo → repoState

ChatInput ──→ [message + post_content + repo_contexts]
                      │
               POST /api/chat/{session_id}/message
                      │
               LangGraph Agent (SSE)
               ├── tool: list_directory / read_file / search_in_repo
               │         ↑ clone_path from DB (repo_id로 lookup)
               └── tool: suggest_edit → pending_edit
                      │
               SSE 이벤트
               ├── token → chatState.messages
               └── edit_suggestion → chatState.pendingEdit
                                          │
                                   "수정안 적용" 클릭
                                          │
                                  postState.content 업데이트
                                  → PATCH /api/posts/{id}
```
