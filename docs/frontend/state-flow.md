# 상태 흐름

## EditorPage 로컬 상태

모든 상태는 `EditorPage` 컴포넌트의 `useState`로 관리된다 (전역 스토어 없음).

```ts
// 포스트
title: string
content: string
status: 'draft' | 'published'

// 레포
repo: RepoResponse | null

// 챗
messages: Message[]          // { role, content, pendingEdit?, pendingPartialEdit? }
isStreaming: boolean
input: string

// 드래그 선택
selection: { start: number; end: number } | null      // textarea의 현재 선택 범위
activeSelection: { start: number; end: number } | null // "이 부분에 대해 묻기" 활성화된 범위
```

대화 기록은 `localStorage["chat_{postId}"]`에 저장 — 페이지 재진입 시 복원.

## 핵심 플로우

### 1. 새 포스트 생성
```
"새 포스트" 버튼 클릭
  → NewPostModal 표시
       ├── 제목 입력
       └── GitHub 레포 검색 + 선택 (GET /api/repos/github)
  → "생성" 클릭
       ├── POST /api/repos/ (레포 DB 등록)
       ├── POST /api/posts/ (포스트 생성)
       ├── POST /api/posts/{id}/repo (레포 연결)
       └── POST /api/repos/{id}/clone (백그라운드 clone)
  → /post/:id 로 이동
```

### 2. 에디터 진입
```
EditorPage mount
  ├── GET /api/posts/{id}       포스트 내용 + status
  └── GET /api/posts/{id}/repo  연결된 레포 정보 + clone_status
       → 챗 헤더에 레포 배지 표시
       → clone 중이면 폴링 (5s 간격)
  ├── localStorage 로드 → messages 복원
```

### 3. 드래그 선택 → 에이전트 질문
```
textarea에서 텍스트 드래그
  → selectionStart / selectionEnd 감지 (onMouseUp / onKeyUp)
  → selection 상태 업데이트
  → "이 부분에 대해 묻기" 버튼 표시

버튼 클릭
  → activeSelection 저장 (start, end)
  → 하이라이트 오버레이 활성화 (절대 위치 div, color: transparent + <mark>)
  → 챗 입력창에 선택 컨텍스트 칩 표시

메시지 전송 시
  → activeSelection 있으면 메시지 앞에 자동으로 추가:
     "[에디터에서 선택한 부분]\n\"...\"\n\n{사용자 입력}"
  → 에이전트가 suggest_partial_edit 또는 일반 대화로 응답 결정
```

### 4. 챗 전송 및 SSE 수신
```
입력 전송
  → payload: { message, post_content, repo_contexts[], history[] }
  → SSE 스트리밍
       token                  → messages[-1].content에 실시간 append
       edit_suggestion        → messages[-1].pendingEdit 저장
       partial_edit_suggestion → messages[-1].pendingPartialEdit 저장
       done                   → isStreaming = false
```

### 5. 수정 제안 적용
```
전체 수정 "적용" 클릭
  → content 전체 교체
  → pendingEdit 초기화

선택 부분 수정 "적용" 클릭
  → content.slice(0, start) + newText + content.slice(end) 로 splice
  → activeSelection 초기화

변경 후 → 자동저장 (1.2s debounce → PATCH /api/posts/{id})
```

### 6. 발행 / 발행 취소
```
HomePage PostCard 발행 버튼
  → PATCH /api/posts/{id} { status: 'published' | 'draft' }
  → 서버: status == 'published' && published_at == null → published_at 자동 설정
  → BlogPage에서 발행된 글만 필터링해 노출
```

### 7. 포스트 삭제
```
PostCard 삭제 버튼
  → confirm 다이얼로그
  → DELETE /api/posts/{id}
       └── 서버: PostRepoReference 먼저 삭제 → Post 삭제
  → localStorage["chat_{postId}"] 제거
  → 목록에서 즉시 제거
```

## 데이터 흐름 다이어그램

```
NewPostModal ──→ POST /api/posts/ ──→ /post/:id

EditorPage mount
  ├── GET /api/posts/{id}
  └── GET /api/posts/{id}/repo
  └── localStorage["chat_{id}"] → messages

textarea (드래그)
  └── activeSelection
        └── 전송 시 메시지에 자동 삽입

ChatInput ──→ POST /api/chat/{session_id}/message
                    │
             LangGraph Agent (SSE)
             ├── list_directory / read_file / search_in_repo
             ├── suggest_edit         → pending_edit (State)
             └── suggest_partial_edit → pending_partial_edit (State)
                    │
             SSE 이벤트
             ├── token                  → messages 실시간 append
             ├── edit_suggestion        → pendingEdit (전체 교체 대기)
             ├── partial_edit_suggestion → pendingPartialEdit (부분 교체 대기)
             └── done

"적용" 클릭 → content 업데이트 → PATCH /api/posts/{id}

HomePage 발행 버튼 → PATCH /api/posts/{id} → BlogPage에 노출
```
