import os
import threading
import git

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Repository


def _clone_worker(repo_id: int, clone_url: str, clone_path: str) -> None:
    """Background thread: git clone then update DB."""
    db = SessionLocal()
    try:
        os.makedirs(clone_path, exist_ok=True)
        git.Repo.clone_from(clone_url, clone_path)
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            from datetime import datetime
            repo.clone_path = clone_path
            repo.cloned_at = datetime.utcnow()
            db.commit()
    except Exception as e:
        # Log but don't crash — caller polls for status
        print(f"[git] clone failed for repo {repo_id}: {e}")
    finally:
        db.close()


def start_clone(repo_id: int, full_name: str, github_token: str) -> str:
    """Kick off a background clone. Returns the target clone_path."""
    clone_path = os.path.join(settings.repos_path, str(repo_id))
    clone_url = f"https://{github_token}@github.com/{full_name}.git"
    t = threading.Thread(target=_clone_worker, args=(repo_id, clone_url, clone_path), daemon=True)
    t.start()
    return clone_path


def get_clone_status(repo: Repository) -> str:
    if repo.cloned_at and repo.clone_path and os.path.exists(repo.clone_path):
        return "cloned"
    if repo.clone_path and os.path.exists(repo.clone_path):
        return "cloning"
    return "not_cloned"
