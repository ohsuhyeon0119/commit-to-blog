# Execution Log

> /executor 가 단계별로 기록하고, /evaluator 가 읽는다.

## 2026-05-23: GitHub 레포 연동 + 포스트 생성 플로우

### 완료된 단계

1. **백엔드: GET /api/repos/github**
   - GitHub REST API로 인증된 유저 레포 목록 반환
   - `backend/app/api/repos.py`

2. **백엔드: POST /api/repos/{id}/clone**
   - gitpython으로 백그라운드 git clone (threading.Thread)
   - clone_path 서버사이드 해결 (path traversal 방어)
   - `backend/app/services/git.py` (신규), `backend/app/api/repos.py`

3. **백엔드: GET /api/posts/{id}/repo + POST /api/posts/{id}/repo**
   - 포스트에 연결된 레포 조회/연결
   - `backend/app/api/posts.py`

4. **스키마 추가**
   - GithubRepoItem, CloneStatusResponse, clone_status on RepoResponse
   - `backend/app/schemas/__init__.py`

5. **프론트: api.ts 확장**
   - listGithubRepos, registerRepo, cloneRepo, getCloneStatus, getPostRepo, linkPostRepo
   - `frontend/src/services/api.ts`

6. **프론트: NewPostModal 컴포넌트**
   - 제목 입력 + GitHub 레포 선택 드롭다운
   - `frontend/src/components/post/NewPostModal.tsx` (신규)

7. **프론트: HomePage에 NewPostModal 연결**
   - `frontend/src/pages/HomePage.tsx`

8. **프론트: EditorPage 레포 정보 패널 + repo_contexts 연결**
   - 레포 뱃지 (이름/상태), clone 폴링, 챗에 repo_contexts 포함
   - `frontend/src/pages/EditorPage.tsx`

### 테스트 결과

- GET /api/repos/github → 레포 100개 반환 ✅
- POST /api/repos/ + POST /api/repos/{id}/clone → clone 성공 (cloned) ✅
- GET /api/posts/{id}/repo → 연결 레포 조회 ✅
- 에이전트 repo_contexts 포함 → 레포 파일 구조 탐색 성공 ✅
- TypeScript 타입 오류 0개 ✅
