# 컴포넌트 구조

## 화면 목록
1. Saved Posts — 초안 포스트 카드 그리드 (HomePage `/`)
2. 포스트 작성/편집 (EditorPage `/post/:postId`)
3. My Blog — 발행된 포스트 목록 (BlogPage `/blog`)
4. 발행된 포스트 읽기 (PostViewPage `/blog/:postId`)
5. 새 포스트 생성 모달 (NewPostModal)

## 디렉터리 구조

```
src/
├── pages/
│   ├── HomePage.tsx        Saved Posts 카드 그리드 + 발행/삭제
│   ├── EditorPage.tsx      에디터 + 챗 패널 + 레포 정보
│   ├── BlogPage.tsx        My Blog 발행 포스트 목록
│   └── PostViewPage.tsx    발행된 포스트 읽기 뷰
│
└── components/
    ├── NavBar.tsx          상단 내비 (Saved Posts / My Blog 탭)
    └── post/
        └── NewPostModal.tsx 새 글 생성 모달 (제목 + 레포 검색/선택)
```

## 화면별 컴포넌트 조합

### HomePage (`/`)
```
NavBar
  Header (내 블로그 + "새 포스트" 버튼)
  카드 그리드 (auto-fill, minmax 280px)
    PostCard (반복)
      ├── 커버 (그라디언트 + 상태 배지 + 날짜)
      ├── 본문 (제목 + 미리보기 3줄)
      └── 액션 (수정하기 / 발행하기 / 삭제)
    NewPostCard (+ 새 포스트 작성 플레이스홀더)
  NewPostModal (조건부)
```

### EditorPage (`/post/:postId`)
```
NavBar
Header (← 뒤로 / 제목 / 저장 상태)
├── 에디터 영역 (좌측, flex: 1)
│     textarea (드래그 선택 가능)
│     하이라이트 오버레이 (선택 부분 시각화)
│     "이 부분에 대해 묻기" 버튼 (선택 시 표시)
│
└── 챗 패널 (우측, 360px 고정)
      챗 헤더 (레포 배지 + 초기화 버튼)
      메시지 목록
        └── 수정 제안 메시지: "적용" 버튼 포함
      선택 컨텍스트 칩 (activeSelection 활성 시)
      입력창 (Enter 전송)
```

### BlogPage (`/blog`)
```
NavBar
Header (My Blog)
발행된 포스트 번호 목록 (01, 02...)
  └── 클릭 → /blog/:postId
```

### PostViewPage (`/blog/:postId`)
```
NavBar
← My Blog 버튼
발행일
제목
본문 (pre-wrap, 일반 문장체)
```

### NewPostModal
```
제목 입력
레포 검색 입력 (텍스트 필터)
레포 목록 (GitHub API에서 로드)
생성 버튼 → /post/:id
```

## 에이전트 챗 흐름

```
사용자 메시지 전송 (선택 텍스트 있으면 컨텍스트 자동 포함)
  → payload: { message, post_content, repo_contexts[], history[] }
  → SSE 스트리밍 수신
       ├── type: "token"                  → 실시간 append
       ├── type: "edit_suggestion"        → "적용" 버튼 (전체 교체)
       ├── type: "partial_edit_suggestion" → "적용" 버튼 (선택 부분만 교체)
       └── type: "done"                  → 스트리밍 종료
```

## 데이터 바인딩 원칙
- `post_content`는 매 챗 전송 시 에디터 현재값을 스냅샷으로 전달
- `repo_contexts`는 포스트에 연결된 레포의 repo_id + branch 목록
- 챗 기록은 `localStorage["chat_{postId}"]`에 포스트별 영구 저장
- 에이전트 레포 파일 탐색은 서버 `clone_path` 기준 (클라이언트 경로 미노출)
