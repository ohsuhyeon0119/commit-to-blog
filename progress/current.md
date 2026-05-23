# 현재 Task

> /whattodo-next 가 작성하고, /orchestrator 가 세션 시작 시 읽는다.

## 상태
진행 중 (executor 대기)

## Task
SQLAlchemy 모델 + 핵심 API 구현

## 목표
DB 스키마(init.sql)를 SQLAlchemy ORM으로 매핑하고,
Posts / Repos API에 실제 DB 동작을 붙인다.
Chat API의 clone_path도 DB에서 조회하도록 수정한다.

## 완료 조건
- [ ] SQLAlchemy ORM 모델 정의 (7개 테이블 전체)
- [ ] Pydantic 응답 스키마 정의
- [ ] Posts API: GET/POST /api/posts, GET/PATCH /api/posts/{id}
- [ ] Repos API: GET /api/repos, POST /api/repos
- [ ] Chat API: resolve_repo_contexts를 DB lookup으로 수정

## 관련 docs
- docs/architecture/data-model.md
- db/init.sql

## 관련 rules
- rules/workflow.md

## 시작일
2026-05-23
