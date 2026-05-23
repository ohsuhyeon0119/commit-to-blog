# 현재 Plan

> /planner 가 작성하고, /executor 가 읽는다.

## 상태
진행 중 (executor 대기)

## Task
SQLAlchemy 모델 + 핵심 API 구현

## 방향
- SQLAlchemy 2.0 스타일 (mapped_column, Mapped)
- Pydantic v2 스키마
- DB 세션은 FastAPI Depends(get_db) 패턴
- user_id는 현재 하드코딩(1) — Auth는 별도 task

## 실행 단계

- [x] 1. SQLAlchemy ORM 모델 정의
        파일: backend/app/models/__init__.py
        테이블: User, Repository, Post, PostRepoReference,
                ChatSession, ChatMessage, ChatRepoContext

- [x] 2. Pydantic 응답 스키마 정의
        파일: backend/app/schemas/__init__.py
        스키마: PostCreate, PostResponse, PostUpdate,
                RepoCreate, RepoResponse

- [x] 3. Posts API 구현
        파일: backend/app/api/posts.py
        엔드포인트: GET /api/posts, POST /api/posts,
                    GET /api/posts/{id}, PATCH /api/posts/{id}

- [x] 4. Repos API 구현
        파일: backend/app/api/repos.py
        엔드포인트: GET /api/repos, POST /api/repos

- [x] 5. Chat API clone_path DB lookup 수정
        파일: backend/app/api/chat.py
        변경: resolve_repo_contexts → DB에서 Repository 조회

## 예상 변경 파일
- backend/app/models/__init__.py   (채우기)
- backend/app/schemas/__init__.py  (채우기)
- backend/app/api/posts.py         (구현)
- backend/app/api/repos.py         (구현)
- backend/app/api/chat.py          (수정)

## 리스크
- post_status, reference_type, message_role enum은 PostgreSQL native enum
  → SQLAlchemy에서 server_default 맞춰야 함
- Auth 미구현 → user_id=1 임시 하드코딩, 추후 교체
