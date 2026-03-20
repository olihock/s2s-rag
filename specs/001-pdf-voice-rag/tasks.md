# Tasks: PDF Document Management with Voice-Based RAG Search

**Input**: Design documents from `/specs/001-pdf-voice-rag/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize TypeScript monorepo with NestJS (backend) and React (frontend) in src/
- [x] T003 [P] Add Dockerfiles for backend, frontend, Milvus, PostgreSQL, and all AI services
- [x] T004 [P] Add Docker Compose config for all services (Milvus, PostgreSQL, Ollama, Faster-Whisper, Piper/Kokoro, Pipecat, backend, frontend)
- [x] T005 [P] Configure ESLint, Prettier, Husky, lint-staged in root
- [x] T006 [P] Add .env.example and dotenv config for all services
- [x] T007 [P] Add Vitest config for backend and frontend
- [x] T008 [P] Add Playwright config for E2E (optional)

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T009 Implement shared type definitions in src/types/
- [x] T010 Implement authentication (JWT/email+password) in backend/src/auth/
- [x] T011 [P] Implement User entity/model in backend/src/entities/user.entity.ts
- [x] T012 [P] Implement User repository/service in backend/src/services/user.service.ts
- [x] T013 [P] Implement PostgreSQL/Prisma setup for relational data in backend/src/db/
- [x] T014 [P] Implement Milvus/Zilliz SDK setup for vector data in backend/src/vector/
- [x] T015 [P] Implement API error handling and validation middleware in backend/src/middleware/
- [x] T016 [P] Implement OpenAPI/Swagger docs in backend/src/main.ts

## Phase 3: User Story 1 - PDF Upload and Voice Q&A (P1)

- [x] T029 [US1] Write failing tests (Red) for PDF upload, voice Q&A, language handling, and answer playback in backend and frontend
- [x] T017 [US1] Implement PDF upload endpoint in backend/src/controllers/documents.controller.ts
- [x] T018 [P] [US1] Implement PDF file validation (type/size, max 100 MB) in backend/src/services/documents.service.ts
- [x] T019 [P] [US1] Implement PDF text extraction, chunking, and language auto-detection (EN/DE) in backend/src/services/documents.service.ts
- [x] T020 [P] [US1] Implement document indexing in Milvus in backend/src/vector/vector.service.ts
- [x] T021 [P] [US1] Implement voice input endpoint (audio upload) in backend/src/controllers/voice.controller.ts
- [x] T022 [P] [US1] Integrate Faster-Whisper STT API in backend/src/services/stt.service.ts
- [x] T023 [P] [US1] Implement semantic search in Milvus with per-user data isolation in backend/src/vector/vector.service.ts
- [x] T024 [P] [US1] Integrate Ollama LLM for answer generation in backend/src/services/llm.service.ts
- [x] T059 [P] [US1] Implement cross-language query routing (EN/DE query against any document language) in backend/src/services/llm.service.ts
- [x] T025 [P] [US1] Integrate Piper/Kokoro TTS for spoken answers in backend/src/services/tts.service.ts
- [x] T026 [P] [US1] Implement frontend PDF upload UI with Tailwind CSS in frontend/src/components/Upload.tsx
- [x] T027 [P] [US1] Implement push-to-talk voice input UI with Tailwind CSS in frontend/src/components/VoiceInput.tsx
- [x] T058 [P] [US1] Implement language selection settings UI with Tailwind CSS in frontend/src/components/LanguageSettings.tsx
- [x] T028 [P] [US1] Implement answer playback and source display UI with Tailwind CSS in frontend/src/components/Answer.tsx

## Phase 4: User Story 2 - OCR Document Scanning (P2)

- [x] T035 [US2] Write failing tests (Red) for OCR upload, extraction, language detection, and search in backend and frontend
- [x] T030 [US2] Implement photo upload endpoint for OCR in backend/src/controllers/documents.controller.ts
- [x] T031 [P] [US2] Implement photo file validation (JPEG/PNG, max 25 MB) and integrate OCR pipeline (Faster-Whisper) in backend/src/services/ocr.service.ts
- [x] T032 [P] [US2] Store OCR-extracted text as document with language detection in backend/src/services/documents.service.ts
- [x] T033 [P] [US2] Index OCR documents in Milvus in backend/src/vector/vector.service.ts
- [x] T034 [P] [US2] Implement frontend photo capture/upload UI with Tailwind CSS in frontend/src/components/OCRUpload.tsx

## Phase 5: User Story 3 - Folder Organization (P3)

- [x] T040 [US3] Write failing tests (Red) for folder CRUD, document assignment, and organization in backend and frontend
- [x] T036 [US3] Implement Folder entity/model in backend/src/entities/folder.entity.ts
- [x] T037 [P] [US3] Implement Folder CRUD endpoints in backend/src/controllers/folders.controller.ts
- [x] T038 [P] [US3] Implement folder assignment for documents in backend/src/services/documents.service.ts
- [x] T039 [P] [US3] Implement folder organization UI with Tailwind CSS in frontend/src/components/FolderTree.tsx

## Phase 6: User Story 4 - Folder Sharing (P4)

- [x] T046 [US4] Write failing tests (Red) for sharing, recipient email validation, access control, and revocation in backend and frontend
- [x] T041 [US4] Implement FolderShare entity/model in backend/src/entities/folder-share.entity.ts
- [x] T042 [P] [US4] Implement folder sharing and revocation endpoints in backend/src/controllers/folders.controller.ts
- [x] T043 [P] [US4] Implement recipient email existence validation with immediate error response in backend/src/services/folders.service.ts
- [x] T044 [P] [US4] Implement shared folder access control guard in backend/src/guards/shared-folder.guard.ts
- [x] T045 [P] [US4] Implement frontend sharing UI with Tailwind CSS in frontend/src/components/ShareFolder.tsx

## Phase 7: User Story 5 - Document Management (P5)

- [x] T051 [US5] Write failing tests (Red) for deletion, restore, exclusion, re-enable, auto-cleanup, and permission enforcement in backend and frontend
- [x] T047 [US5] Implement RecycleBin entity/model in backend/src/entities/recycle-bin.entity.ts
- [x] T048 [P] [US5] Implement document/folder deletion and restore endpoints in backend/src/controllers/recycle-bin.controller.ts
- [x] T049 [P] [US5] Implement exclusion/re-enable from search in backend/src/services/documents.service.ts
- [x] T057 [P] [US5] Implement recycle bin auto-cleanup scheduler (30-day retention) in backend/src/jobs/recycle-bin-cleanup.job.ts
- [x] T050 [P] [US5] Implement frontend recycle bin UI with Tailwind CSS in frontend/src/components/RecycleBin.tsx

## Final Phase: Polish & Cross-Cutting

- [x] T052 [P] Add i18n (EN/DE) support in frontend and backend
- [x] T053 [P] Add API and UI error handling for all edge cases
- [x] T054 [P] Add health checks for all services in Docker Compose
- [x] T055 [P] Add README and architecture diagram in root/docs/
- [x] T056 [P] Add E2E tests for critical user journeys (optional)

## Dependencies

- US1 (P1) must be complete before US2, US3, US4, US5
- US3 (Folder Organization) must be complete before US4 (Folder Sharing)
- US2 (OCR) is independent of US3–US5 and can proceed in parallel after US1
- US5 (Document Management) is independent of US2–US4 after US1
- Foundational tasks must be completed before any user story phase
- Setup phase must be completed before foundational
- Within each phase: test tasks (T029, T035, T040, T046, T051) MUST be written first (Red), then implementation tasks (Green/Refactor)

## Parallel Execution Examples

- Dockerfiles, Docker Compose, ESLint/Prettier, Vitest, Playwright, .env can be done in parallel (Setup)
- User, Folder, FolderShare, RecycleBin entities/models can be implemented in parallel (Foundational)
- PDF upload, OCR, folder CRUD, sharing, and recycle bin features can be developed/tested in parallel per user story

## Implementation Strategy

- MVP: Complete all tasks for User Story 1 (PDF upload and voice Q&A)
- Incremental: Deliver each user story as a testable, independent increment
- Polish: Add i18n, error handling, health checks, docs, and E2E after core features
