# 현재 Task

> /whattodo-next 가 작성하고, /orchestrator 가 세션 시작 시 읽는다.

## 상태
진행 중 (planner 대기)

## Task
LangGraph 에이전트 아키텍처 설계

## 목표
LLM API + LangGraph로 에이전트 챗 ↔ 블로그 수정 흐름을 설계한다.
에이전트가 사용자와 대화하면서 블로그 글에 수정 제안을 내놓는 구조를 정의한다.

## 완료 조건
- [ ] LangGraph 상태(State) 정의 (챗 메시지, 현재 블로그 content, 레포 컨텍스트 등)
- [ ] LangGraph 노드 설계 (사용자 입력 처리 → 레포 탐색 → 수정 제안 생성 → 응답)
- [ ] 에이전트 수정 제안 → 에디터 반영 흐름 정의 (포맷, 적용 버튼 트리거 방식)
- [ ] LLM API 연동 방식 결정 (모델, tool calling 사용 여부)
- [ ] docs/backend/agent.md 에 설계 내용 문서화

## 관련 docs
- docs/backend/agent.md (신규 생성 예정)
- docs/architecture/data-model.md
- docs/frontend/state-flow.md

## 관련 rules
- rules/workflow.md

## 시작일
2026-05-23
