from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Repository
from app.schemas import RepoCreate, RepoResponse

router = APIRouter()

TEMP_USER_ID = 1


@router.get("/", response_model=list[RepoResponse])
def list_repos(db: Session = Depends(get_db)):
    return db.query(Repository).filter(Repository.user_id == TEMP_USER_ID).all()


@router.post("/", response_model=RepoResponse, status_code=201)
def register_repo(body: RepoCreate, db: Session = Depends(get_db)):
    existing = db.query(Repository).filter(
        Repository.user_id == TEMP_USER_ID,
        Repository.github_repo_id == body.github_repo_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Repository already registered")
    repo = Repository(user_id=TEMP_USER_ID, **body.model_dump())
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo
