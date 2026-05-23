import re
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.tools import FILE_TOOLS

SYSTEM_PROMPT = """당신은 개발 블로그 포스트 작성을 도와주는 AI 글쓰기 어시스턴트입니다.

사용자의 GitHub 레포지토리 파일에 접근할 수 있습니다. 필요할 때 코드베이스 맥락을 파악하는 데 활용하세요.

사용 가능한 도구:
- list_directory: 레포 디렉터리 구조 탐색
- read_file: 특정 파일 내용 읽기
- search_in_repo: 레포 전체에서 키워드 검색
- suggest_edit: 블로그 포스트 내용 전체를 새 버전으로 제안

규칙:
- 사용자 메시지에 [에디터에서 선택한 부분] 섹션이 있으면, 해당 텍스트가 질문의 대상입니다. 사용자의 요청이 수정/교체라면 suggest_partial_edit를 사용하세요. 설명, 피드백, 의견 요청이라면 suggest_edit 없이 대화로 답변하세요.
- 전체 글 수정 요청("전체 다시 써줘", "처음부터 작성해줘" 등)에는 suggest_edit를 사용하세요.
- 에디터에 내용을 새로 작성하거나 추가하는 요청("작성해봐", "써봐", "추가해줘" 등)에는 suggest_edit를 사용하세요.
- 도구를 호출하지 않고 수정 내용을 텍스트로만 설명하지 마세요.
- 도구 호출 후에는 무엇을 바꿨는지 1~2문장으로 간략히 설명하세요.
- 일반 질문, 레포 탐색, 조언처럼 에디터 변경이 필요 없는 요청은 도구 없이 대화로 응답하세요.
- 모든 응답은 반드시 한국어 존댓말로 작성하세요.
- 블로그 글을 쓸 때는 마크다운 형식(#, **, -, 코드블록 등)을 사용하지 마세요. 소감문이나 감상문처럼 자연스러운 일반 문장으로 작성하세요. 단락과 문장으로만 구성하세요.
- 답변은 간결하게, 블로그 작성 과제에 집중하세요.
"""

from app.core.config import settings as _settings

_model_name = getattr(_settings, "openai_model", "gpt-4o-mini")
llm = ChatOpenAI(model=_model_name, temperature=0.7, streaming=True)
llm_with_tools = llm.bind_tools(FILE_TOOLS)

EDIT_PATTERN = re.compile(
    r"__EDIT_SUGGESTION__(.+?)__END_SUGGESTION__", re.DOTALL
)
PARTIAL_EDIT_PATTERN = re.compile(
    r"__PARTIAL_EDIT__(.+?)__END_PARTIAL__", re.DOTALL
)


def call_model(state: AgentState) -> dict:
    system = SystemMessage(content=SYSTEM_PROMPT)

    repo_info = ""
    if state.get("repo_contexts"):
        paths = [r["clone_path"] for r in state["repo_contexts"]]
        repo_info = f"\nCurrently referenced repos (clone paths): {paths}"
        system = SystemMessage(content=SYSTEM_PROMPT + repo_info)

    post_context = f"\n\nCurrent blog post content:\n---\n{state['post_content']}\n---"
    system = SystemMessage(content=system.content + post_context)

    response = llm_with_tools.invoke([system] + state["messages"])
    return {"messages": [response]}


def execute_tools(state: AgentState) -> dict:
    last_message = state["messages"][-1]
    tool_map = {t.name: t for t in FILE_TOOLS}

    results = []
    pending_edit = state.get("pending_edit")
    pending_partial_edit = state.get("pending_partial_edit")

    for tool_call in last_message.tool_calls:
        tool = tool_map.get(tool_call["name"])
        if tool is None:
            output = f"Unknown tool: {tool_call['name']}"
        else:
            output = tool.invoke(tool_call["args"])

        match = EDIT_PATTERN.search(str(output))
        if match:
            pending_edit = match.group(1).strip()
            output = "전체 수정 제안이 저장되었습니다. 사용자가 적용 버튼을 볼 것입니다."

        partial_match = PARTIAL_EDIT_PATTERN.search(str(output))
        if partial_match:
            pending_partial_edit = partial_match.group(1).strip()
            output = "선택 부분 수정 제안이 저장되었습니다. 사용자가 적용 버튼을 볼 것입니다."

        results.append(
            ToolMessage(content=str(output), tool_call_id=tool_call["id"])
        )

    update: dict = {"messages": results}
    if pending_edit is not None:
        update["pending_edit"] = pending_edit
    if pending_partial_edit is not None:
        update["pending_partial_edit"] = pending_partial_edit
    return update


def should_continue(state: AgentState) -> str:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "execute_tools"
    return END


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("call_model", call_model)
    graph.add_node("execute_tools", execute_tools)
    graph.set_entry_point("call_model")
    graph.add_conditional_edges("call_model", should_continue)
    graph.add_edge("execute_tools", "call_model")
    return graph.compile()


agent_graph = build_graph()
