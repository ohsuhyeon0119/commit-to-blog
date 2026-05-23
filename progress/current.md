# 현재 Task

## 상태
진행 중 (executor 대기)

## Task
GitHub 레포 연동 + 포스트 생성 플로우

## 목표
새 포스트 생성 시 GitHub 레포를 선택하고 연결한다.
서버에서 레포를 clone하고, 에디터에서 레포 정보를 보여주며
에이전트가 해당 레포를 탐색할 수 있게 한다.

## 완료 조건
- [ ] GET /api/repos/github — GitHub API로 유저 레포 목록 조회
- [ ] POST /api/repos/{id}/clone — 선택 레포 git clone
- [ ] GET /api/posts/{id}/repo — 포스트에 연결된 레포 조회
- [ ] 프론트: 새 포스트 생성 모달 (제목 + 레포 선택)
- [ ] 프론트: 에디터 레포 정보 패널 (이름, 브랜치, clone 상태)
- [ ] 프론트: 챗 전송 시 repo_contexts에 연결 레포 포함

## 관련 docs
- docs/README.md
- docs/frontend/state-flow.md
- docs/frontend/components.md

## 관련 rules
- rules/workflow.md

## 시작일
2026-05-23
