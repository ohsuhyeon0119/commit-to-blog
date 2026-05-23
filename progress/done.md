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
