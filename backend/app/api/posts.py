from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Post
from app.schemas import PostCreate, PostResponse, PostUpdate

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
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == TEMP_USER_ID).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(post, field, value)
    db.commit()
    db.refresh(post)
    return post
