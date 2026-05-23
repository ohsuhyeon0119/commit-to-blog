import re
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.tools import FILE_TOOLS

SYSTEM_PROMPT = """You are a writing assistant that helps users write and improve their development blog posts.

You have access to the user's GitHub repository files. Use them to understand the codebase context when needed.

Tools available:
- list_directory: browse the repo structure
- read_file: read a specific file
- search_in_repo: search for keywords across the repo
- suggest_edit: propose a FULL replacement for the blog post content

Rules:
- Only call suggest_edit when the user explicitly asks to modify/rewrite/update the post.
- For general questions or exploration, use the other tools and respond conversationally.
- Keep responses concise and focused on the blog writing task.
"""

from app.core.config import settings as _settings

_model_name = getattr(_settings, "openai_model", "gpt-4o-mini")
llm = ChatOpenAI(model=_model_name, temperature=0.7, streaming=True)
llm_with_tools = llm.bind_tools(FILE_TOOLS)

EDIT_PATTERN = re.compile(
    r"__EDIT_SUGGESTION__(.+?)__END_SUGGESTION__", re.DOTALL
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

    for tool_call in last_message.tool_calls:
        tool = tool_map.get(tool_call["name"])
        if tool is None:
            output = f"Unknown tool: {tool_call['name']}"
        else:
            output = tool.invoke(tool_call["args"])

        # intercept suggest_edit result
        match = EDIT_PATTERN.search(str(output))
        if match:
            pending_edit = match.group(1).strip()
            output = "Edit suggestion recorded. The user will see an apply button."

        results.append(
            ToolMessage(content=str(output), tool_call_id=tool_call["id"])
        )

    update: dict = {"messages": results}
    if pending_edit is not None:
        update["pending_edit"] = pending_edit
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
