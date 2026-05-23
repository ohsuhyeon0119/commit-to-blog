from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict


class RepoContext(TypedDict):
    repo_id: int
    clone_path: str
    branch: str


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    post_content: str
    repo_contexts: list[RepoContext]
    pending_edit: str | None
