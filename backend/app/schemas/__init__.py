from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models import PostStatus


# ── Post ──────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str
    content: str = ""


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[PostStatus] = None


class PostResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    status: PostStatus
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Repository ────────────────────────────────────────

class RepoCreate(BaseModel):
    github_repo_id: str
    owner: str
    name: str
    full_name: str


class RepoResponse(BaseModel):
    id: int
    user_id: int
    github_repo_id: str
    owner: str
    name: str
    full_name: str
    clone_path: Optional[str] = None
    cloned_at: Optional[datetime] = None
    clone_status: str = "not_cloned"   # not_cloned | cloning | cloned | error

    model_config = {"from_attributes": True}


class GithubRepoItem(BaseModel):
    """GitHub API에서 받은 레포 정보 (DB 저장 전)"""
    github_repo_id: str
    owner: str
    name: str
    full_name: str
    description: Optional[str] = None
    private: bool = False
    default_branch: str = "main"


class CloneStatusResponse(BaseModel):
    repo_id: int
    status: str          # cloning | cloned | error
    clone_path: Optional[str] = None
    message: Optional[str] = None


# ── Chat ──────────────────────────────────────────────

class ChatSessionResponse(BaseModel):
    id: int
    post_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
