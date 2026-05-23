# 현재 Plan

> /planner 가 작성하고, /executor 가 읽는다.

## 상태
진행 중 (executor 대기)

## Task
LangGraph 에이전트 아키텍처 설계

## 방향
- 패턴: ReAct (call_model → execute_tools 루프)
- 수정 제안: Full content 교체
- LLM: OpenAI (tool calling)
- 응답: SSE 스트리밍

## 실행 단계

- [ ] 1. AgentState 정의
        파일: backend/app/agent/state.py
        내용: messages, post_content, repo_contexts, pending_edit

- [ ] 2. 파일 탐색 도구 구현
        파일: backend/app/agent/tools.py
        도구: list_directory / read_file / search_in_repo / suggest_edit

- [ ] 3. LangGraph 그래프 구성
        파일: backend/app/agent/graph.py
        구조: call_model → router → execute_tools → call_model (루프)

- [ ] 4. 챗 API 엔드포인트 수정 (SSE 스트리밍)
        파일: backend/app/api/chat.py
        엔드포인트: POST /api/chat/{session_id}/message
        SSE 이벤트: token | edit_suggestion | done

- [ ] 5. docs/backend/agent.md 문서화
        내용: State/노드/SSE 포맷 + 설계 결정 기록

## 예상 변경 파일
- backend/app/agent/state.py       (신규)
- backend/app/agent/tools.py       (신규)
- backend/app/agent/graph.py       (신규)
- backend/app/agent/__init__.py    (신규)
- backend/app/api/chat.py          (수정)
- docs/backend/agent.md            (신규)

## 리스크
- suggest_edit 남용 → system prompt로 제한
- 레포 clone_path Docker 볼륨 마운트 확인 필요
