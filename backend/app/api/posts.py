from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Post, PostRepoReference, Repository
from app.schemas import PostCreate, PostResponse, PostUpdate, RepoResponse
from app.services.git import get_clone_status

router = APIRouter()

# TODO: replace with real auth dependency
TEMP_USER_ID = 1


@router.get("/", response_model=list[PostResponse])
def list_posts(db: Session = Depends(get_db)):
    return db.query(Post).filter(Post.user_id == TEMP_USER_ID).order_by(Post.updated_at.desc()).all()


@router.post("/", response_model=PostResponse, status_code=201)
def create_post(body: PostCreate, db: Session = Depends(get_db)):
    post = Post(user_id=TEMP_USER_ID, title=body.title, content=body.content)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == TEMP_USER_ID).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.patch("/{post_id}", response_model=PostResponse)
def update_post(post_id: int, body: PostUpdate, db: Session = Depends(get_db)):
    from datetime import datetime
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == TEMP_USER_ID).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(post, field, value)
    if body.status == 'published' and post.published_at is None:
        post.published_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == TEMP_USER_ID).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.query(PostRepoReference).filter(PostRepoReference.post_id == post_id).delete()
    db.delete(post)
    db.commit()


# ── 포스트-레포 연결 ───────────────────────────────────

class PostRepoLinkBody(BaseModel):
    repo_id: int
    branch: str = "main"


@router.get("/{post_id}/repo", response_model=RepoResponse | None)
def get_post_repo(post_id: int, db: Session = Depends(get_db)):
    ref = db.query(PostRepoReference).filter(PostRepoReference.post_id == post_id).first()
    if not ref:
        return None
    repo = db.query(Repository).filter(Repository.id == ref.repo_id).first()
    if not repo:
        return None
    data = RepoResponse.model_validate(repo)
    data.clone_status = get_clone_status(repo)
    return data


@router.post("/{post_id}/repo", response_model=RepoResponse, status_code=201)
def link_post_repo(post_id: int, body: PostRepoLinkBody, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == TEMP_USER_ID).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    repo = db.query(Repository).filter(Repository.id == body.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # 기존 연결 제거 후 재연결 (포스트당 레포 1개)
    db.query(PostRepoReference).filter(PostRepoReference.post_id == post_id).delete()
    ref = PostRepoReference(post_id=post_id, repo_id=body.repo_id, branch=body.branch)
    db.add(ref)
    db.commit()

    data = RepoResponse.model_validate(repo)
    data.clone_status = get_clone_status(repo)
    return data
