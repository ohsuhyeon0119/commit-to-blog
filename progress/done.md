# Done

> /evaluator 가 검증 완료 후 여기로 이동시킨다.

---

## 2026-05-17 프로젝트 주제 결정 (메타 task)
- 완료 조건: 모두 충족 (4/4)
- 주요 변경: docs/adr/, docs/architecture/, docs/frontend/ 전체 신규 생성
- 관련 docs 업데이트: 있음 (docs/README.md)

## 2026-05-17 개발 환경 셋팅
- 완료 조건: 모두 충족 (5/5)
- 주요 변경: docker-compose.yml, frontend/, backend/, db/init.sql 생성
- 관련 docs 업데이트: 없음

## 2026-05-23 프론트엔드 핵심 UI 구현
- 완료 조건: 모두 충족 (6/6)
- 주요 변경:
  - frontend/src/services/api.ts — posts CRUD + SSE chat stream
  - frontend/src/index.css — 다크 테마 디자인 토큰
  - frontend/src/App.tsx — react-router-dom 라우팅
  - frontend/src/pages/HomePage.tsx — 포스트 목록 + 생성
  - frontend/src/pages/EditorPage.tsx — 마크다운 에디터 + 챗 패널
  - .gitignore 추가
- 테스트: TypeScript 에러 0, vite build ✅, API 전 엔드포인트 실제 검증
- 관련 docs 업데이트: 없음

## 2026-05-23 SQLAlchemy 모델 + 핵심 API 구현
- 완료 조건: 모두 충족 (5/5)
- 주요 변경:
  - backend/app/models/__init__.py — ORM 모델 7개 (User, Repository, Post, PostRepoReference, ChatSession, ChatMessage, ChatRepoContext)
  - backend/app/schemas/__init__.py — Pydantic 스키마
  - backend/app/api/posts.py — CRUD API
  - backend/app/api/repos.py — 목록/등록 API
  - backend/app/api/chat.py — clone_path DB lookup 적용
- 관련 docs 업데이트: 없음 (기존 data-model.md와 일치)

## 2026-05-23 LangGraph 에이전트 아키텍처 설계
- 완료 조건: 모두 충족 (5/5)
- 주요 변경:
  - backend/app/agent/state.py (신규) — AgentState, RepoContext, RepoContextRequest
  - backend/app/agent/tools/__init__.py — list_directory, read_file, search_in_repo, suggest_edit
  - backend/app/agent/graph.py (신규) — ReAct 그래프 (call_model ↔ execute_tools)
  - backend/app/api/chat.py — SSE 스트리밍 엔드포인트
  - backend/app/core/config.py — openai_model, repos_path 설정 추가
  - docs/backend/agent.md (신규) — 설계 문서
- 보안 수정: clone_path 클라이언트 주입 → repo_id만 받고 서버에서 경로 구성
- 기능 수정: assistant 메시지 history 복원
- 관련 docs 업데이트: 있음 (docs/backend/agent.md 신규)
