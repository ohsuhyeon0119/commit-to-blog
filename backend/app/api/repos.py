import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Repository
from app.schemas import RepoCreate, RepoResponse, GithubRepoItem, CloneStatusResponse
from app.services.git import start_clone, get_clone_status

router = APIRouter()

TEMP_USER_ID = 1


@router.get("/github", response_model=list[GithubRepoItem])
async def list_github_repos():
    """GitHub REST API로 인증된 유저의 레포 목록 반환."""
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.github.com/user/repos",
            headers=headers,
            params={"per_page": 100, "sort": "updated", "type": "all"},
        )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail="GitHub API 호출 실패")

    return [
        GithubRepoItem(
            github_repo_id=str(r["id"]),
            owner=r["owner"]["login"],
            name=r["name"],
            full_name=r["full_name"],
            description=r.get("description"),
            private=r["private"],
            default_branch=r.get("default_branch", "main"),
        )
        for r in res.json()
    ]


@router.get("/", response_model=list[RepoResponse])
def list_repos(db: Session = Depends(get_db)):
    repos = db.query(Repository).filter(Repository.user_id == TEMP_USER_ID).all()
    result = []
    for r in repos:
        data = RepoResponse.model_validate(r)
        data.clone_status = get_clone_status(r)
        result.append(data)
    return result


@router.post("/", response_model=RepoResponse, status_code=201)
def register_repo(body: RepoCreate, db: Session = Depends(get_db)):
    existing = db.query(Repository).filter(
        Repository.user_id == TEMP_USER_ID,
        Repository.github_repo_id == body.github_repo_id,
    ).first()
    if existing:
        data = RepoResponse.model_validate(existing)
        data.clone_status = get_clone_status(existing)
        return data
    repo = Repository(user_id=TEMP_USER_ID, **body.model_dump())
    db.add(repo)
    db.commit()
    db.refresh(repo)
    data = RepoResponse.model_validate(repo)
    data.clone_status = get_clone_status(repo)
    return data


@router.post("/{repo_id}/clone", response_model=CloneStatusResponse)
def clone_repo(repo_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.user_id == TEMP_USER_ID,
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    status = get_clone_status(repo)
    if status == "cloned":
        return CloneStatusResponse(repo_id=repo_id, status="cloned", clone_path=repo.clone_path)

    clone_path = start_clone(repo_id, repo.full_name, settings.github_token)
    return CloneStatusResponse(repo_id=repo_id, status="cloning", clone_path=clone_path,
                               message="Clone started in background. Poll /api/repos/ for status.")


@router.get("/{repo_id}/clone-status", response_model=CloneStatusResponse)
def clone_status(repo_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    status = get_clone_status(repo)
    return CloneStatusResponse(repo_id=repo_id, status=status, clone_path=repo.clone_path)
