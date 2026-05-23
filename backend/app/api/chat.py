import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agent.graph import agent_graph
from app.agent.state import RepoContextRequest, RepoContext
from app.core.config import settings

router = APIRouter()


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    post_content: str
    repo_contexts: list[RepoContextRequest] = []
    history: list[HistoryMessage] = []


def resolve_repo_contexts(requests: list[RepoContextRequest]) -> list[RepoContext]:
    """Convert client repo_id references to server-side clone_path."""
    return [
        RepoContext(
            repo_id=r["repo_id"],
            clone_path=f"{settings.repos_path}/{r['repo_id']}",
            branch=r["branch"],
        )
        for r in requests
    ]


async def event_stream(request: ChatRequest):
    from langchain_core.messages import HumanMessage, AIMessage, AIMessageChunk

    messages = []
    for msg in request.history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))
    messages.append(HumanMessage(content=request.message))

    initial_state = {
        "messages": messages,
        "post_content": request.post_content,
        "repo_contexts": resolve_repo_contexts(request.repo_contexts),
        "pending_edit": None,
    }

    async for event in agent_graph.astream_events(initial_state, version="v2"):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if isinstance(chunk, AIMessageChunk) and chunk.content:
                data = json.dumps({"type": "token", "content": chunk.content})
                yield f"data: {data}\n\n"

        elif kind == "on_chain_end" and event["name"] == "execute_tools":
            output = event["data"].get("output", {})
            pending_edit = output.get("pending_edit")
            if pending_edit:
                data = json.dumps({"type": "edit_suggestion", "content": pending_edit})
                yield f"data: {data}\n\n"

    yield "data: " + json.dumps({"type": "done"}) + "\n\n"


@router.post("/{session_id}/message")
async def send_message(session_id: int, request: ChatRequest):
    return StreamingResponse(
        event_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/")
def list_sessions():
    return []
