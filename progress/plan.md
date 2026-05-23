# 현재 Plan

## 상태
진행 중 (executor 대기)

## Task
GitHub 레포 연동 + 포스트 생성 플로우

## 방향
- GitHub REST API (token 인증, GraphQL 대신 REST로 단순화)
- git clone: gitpython (requirements.txt에 이미 있음)
- 포스트-레포 연결: PostRepoReference 테이블 활용
- 프론트: NewPostModal 컴포넌트 신규 생성

## 실행 단계

- [x] 1. 백엔드: GET /api/repos/github
        GitHub REST API로 인증된 유저의 레포 목록 반환
        파일: backend/app/api/repos.py

- [x] 2. 백엔드: POST /api/repos/{id}/clone
        gitpython으로 서버에 git clone
        clone_path = {settings.repos_path}/{repo_id}
        파일: backend/app/api/repos.py, backend/app/services/git.py

- [ ] 3. 백엔드: GET /api/posts/{id}/repo + POST /api/posts/{id}/repo
        포스트에 연결된 레포 조회/연결
        파일: backend/app/api/posts.py

- [x] 4. 스키마 추가
        GithubRepoItem, CloneStatus 등
        파일: backend/app/schemas/__init__.py

- [x] 5. 프론트: api.ts 확장
        listGithubRepos, cloneRepo, getPostRepo, setPostRepo
        파일: frontend/src/services/api.ts

- [x] 6. 프론트: NewPostModal 컴포넌트
        제목 입력 + GitHub 레포 선택 드롭다운
        파일: frontend/src/components/post/NewPostModal.tsx

- [x] 7. 프론트: HomePage에 NewPostModal 연결
        파일: frontend/src/pages/HomePage.tsx

- [x] 8. 프론트: EditorPage 레포 정보 패널 + repo_contexts 연결
        파일: frontend/src/pages/EditorPage.tsx

## 예상 변경 파일
- backend/app/api/repos.py
- backend/app/api/posts.py
- backend/app/services/__init__.py (git clone 서비스)
- backend/app/schemas/__init__.py
- backend/app/core/config.py
- frontend/src/services/api.ts
- frontend/src/components/post/NewPostModal.tsx (신규)
- frontend/src/pages/HomePage.tsx
- frontend/src/pages/EditorPage.tsx

## 리스크
- git clone은 시간이 걸림 → 백그라운드 처리, clone 상태 폴링
- private 레포 clone: GITHUB_TOKEN을 clone URL에 포함
- clone_path 권한: Docker 볼륨 마운트 확인 필요
