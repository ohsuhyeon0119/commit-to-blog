# 컴포넌트 구조

## 화면 목록
1. 포스트 목록 (HomePage)
2. 포스트 작성/편집 (EditorPage)
3. 새 포스트 생성 모달 (NewPostModal)

## 디렉터리 구조

```
src/
├── pages/
│   ├── HomePage.tsx           포스트 목록 화면
│   └── EditorPage.tsx         에디터 + 챗 + 레포 정보 화면
│
└── components/
    ├── post/
    │   ├── NewPostModal.tsx    새 글 생성 모달 (제목 + 레포 선택)
    │   └── PostCard.tsx        목록 카드
    │
    ├── editor/
    │   └── MarkdownEditor.tsx  마크다운 textarea 에디터
    │
    ├── chat/
    │   ├── ChatPanel.tsx       우측 챗 전체 패널
    │   ├── ChatMessage.tsx     메시지 1개
    │   └── ChatInput.tsx       입력창
    │
    └── repo/
        └── RepoInfoPanel.tsx   연결된 레포 기본 정보 패널
```

## 화면별 컴포넌트 조합

### HomePage
```
Layout
  Header (로고 + "새 글 작성" 버튼)
  PostCard (반복)
  NewPostModal (새 글 버튼 클릭 시 표시)
    └── 제목 입력
    └── GitHub 레포 선택 (드롭다운)
    └── 생성 버튼 → /post/:id 로 이동
```

### EditorPage
```
Header (← 목록 / 제목 / 저장 상태)
├── MarkdownEditor (좌측, flex: 1)
│     textarea + 자동저장(1.2s debounce)
│
├── RepoInfoPanel (우상단 or 에디터 상단 바)
│     연결된 레포 이름, 브랜치, 파일 수 등 기본 정보
│
└── ChatPanel (우측, 360px 고정)
      ChatMessage (반복)
        └── 수정 제안이면 "적용" 버튼 포함
      ChatInput (Enter 전송)
```

## 에이전트 챗 흐름

```
사용자 메시지 전송
  → payload: { message, post_content, repo_contexts[], history[] }
  → SSE 스트리밍 수신
       ├── type: "token"          → 챗 메시지에 실시간 append
       ├── type: "edit_suggestion" → "수정안 적용" 버튼 표시
       └── type: "done"           → 스트리밍 종료

"수정안 적용" 클릭
  → MarkdownEditor content 전체 교체
  → 다음 저장 사이클에서 DB 반영
```

## 데이터 바인딩 원칙
- `post_content`는 매 챗 전송 시 에디터 현재값을 스냅샷으로 전달
- `repo_contexts`는 포스트에 연결된 레포의 repo_id + branch 목록
- 에이전트가 레포 파일을 탐색할 때는 서버의 clone_path에서 읽음
