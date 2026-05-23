# 현재 Plan

## 상태
진행 중 (executor 대기)

## Task
프론트엔드 핵심 UI 구현

## 방향
- react-router-dom으로 SPA 라우팅
- 외부 UI 라이브러리 없음 (CSS Variables 기반 다크 테마)
- 마크다운 에디터: 네이티브 textarea (라이브러리 없음)
- SSE: fetch + ReadableStream (EventSource는 POST 불가)
- 상태관리: React useState (Zustand 불필요한 규모)

## 실행 단계

- [x] 1. react-router-dom 설치
- [x] 2. src/services/api.ts (posts CRUD + SSE stream)
- [x] 3. src/index.css (다크 테마 디자인 토큰)
- [x] 4. src/App.tsx (라우팅)
- [x] 5. src/pages/HomePage.tsx
- [x] 6. src/pages/EditorPage.tsx
- [ ] 7. 실행 테스트

## 예상 변경 파일
- frontend/package.json
- frontend/src/App.tsx
- frontend/src/index.css
- frontend/src/App.css
- frontend/src/services/api.ts  (신규)
- frontend/src/pages/HomePage.tsx  (신규)
- frontend/src/pages/EditorPage.tsx  (신규)
