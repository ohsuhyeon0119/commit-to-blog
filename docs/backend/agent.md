# 에이전트 아키텍처

## 개요

LangGraph ReAct 패턴으로 구현한 블로그 글쓰기 협업 에이전트.
사용자가 챗으로 요청하면 에이전트가 GitHub 레포 파일을 탐색하고
블로그 글 수정을 제안한다.

## 설계 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 탐색 방식 | 파일시스템 직접 탐색 | RAG보다 유연, 구현 단순 |
| 에이전트 패턴 | ReAct (tool call 루프) | 동적 탐색 가능 |
| 수정 제안 포맷 | Full content 교체 | 초기 구현 단순화 |
| LLM | gpt-4o-mini | 비용/성능 균형 |
| 스트리밍 | SSE (Server-Sent Events) | 실시간 타이핑 효과 |

## AgentState

```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    post_content: str           # 현재 블로그 내용 (매 요청마다 주입)
    repo_contexts: list[RepoContext]  # 선택된 레포 목록
    pending_edit: str | None    # 수정 제안 (프론트 "적용" 버튼용)
```

## LangGraph 노드 흐름

```
START
  └→ call_model
       ├─ tool_calls 있음 → execute_tools → call_model (루프)
       └─ tool_calls 없음 → END
```

## 도구 목록

| 도구 | 설명 |
|------|------|
| `list_directory(clone_path, subpath)` | 디렉터리 목록 조회 |
| `read_file(clone_path, file_path)` | 파일 내용 읽기 (8000자 제한) |
| `search_in_repo(clone_path, query)` | 전체 레포 텍스트 검색 (최대 30건) |
| `suggest_edit(new_content)` | 블로그 전체 내용 교체 제안 |

`suggest_edit`는 `execute_tools` 노드에서 인터셉트해
`pending_edit` 상태에 저장한다. SSE로 프론트에 별도 이벤트로 전달.

## SSE 이벤트 포맷

엔드포인트: `POST /api/chat/{session_id}/message`

```json
// 스트리밍 토큰
{"type": "token", "content": "안녕하세요..."}

// 수정 제안 (전체 content 교체)
{"type": "edit_suggestion", "content": "# 제목\n\n수정된 전체 내용..."}

// 완료
{"type": "done"}
```

## 프론트 연동

`docs/frontend/state-flow.md`의 `chatState.pendingEdit`에 저장.
`edit_suggestion` 이벤트 수신 시 챗 메시지에 "적용" 버튼 표시.
클릭 시 `postState.content` 전체 교체.
