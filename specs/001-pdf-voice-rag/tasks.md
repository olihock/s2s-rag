# Tasks: PDF Document Management with Voice-Based RAG Search

**Input**: Design documents from `/specs/001-pdf-voice-rag/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize TypeScript monorepo with NestJS (backend) and React (frontend) in src/
- [ ] T003 [P] Add Dockerfiles for backend, frontend, Milvus, PostgreSQL, and all AI services
- [ ] T004 [P] Add Docker Compose config for all services (Milvus, PostgreSQL, Ollama, Faster-Whisper, Piper/Kokoro, Pipecat, backend, frontend)
- [ ] T005 [P] Configure ESLint, Prettier, Husky, lint-staged in root
- [ ] T006 [P] Add .env.example and dotenv config for all services
- [ ] T007 [P] Add Vitest config for backend and frontend
- [ ] T008 [P] Add Playwright config for E2E (optional)

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T009 Implement shared type definitions in src/types/
- [ ] T010 Implement authentication (JWT/email+password) in backend/src/auth/
- [ ] T011 [P] Implement User entity/model in backend/src/entities/user.entity.ts
- [ ] T012 [P] Implement User repository/service in backend/src/services/user.service.ts
- [ ] T013 [P] Implement PostgreSQL/Prisma setup for relational data in backend/src/db/
- [ ] T014 [P] Implement Milvus/Zilliz SDK setup for vector data in backend/src/vector/
- [ ] T015 [P] Implement API error handling and validation middleware in backend/src/middleware/
- [ ] T016 [P] Implement OpenAPI/Swagger docs in backend/src/main.ts

## Phase 3: User Story 1 - PDF Upload and Voice Q&A (P1)

- [ ] T017 [US1] Implement PDF upload endpoint in backend/src/controllers/documents.controller.ts
- [ ] T018 [P] [US1] Implement PDF file validation (type/size) in backend/src/services/documents.service.ts
- [ ] T019 [P] [US1] Implement PDF text extraction and chunking in backend/src/services/documents.service.ts
- [ ] T020 [P] [US1] Implement document indexing in Milvus in backend/src/vector/vector.service.ts
- [ ] T021 [P] [US1] Implement voice input endpoint (audio upload) in backend/src/controllers/voice.controller.ts
- [ ] T022 [P] [US1] Integrate Faster-Whisper STT API in backend/src/services/stt.service.ts
- [ ] T023 [P] [US1] Implement semantic search in Milvus in backend/src/vector/vector.service.ts
- [ ] T024 [P] [US1] Integrate Ollama LLM for answer generation in backend/src/services/llm.service.ts
- [ ] T025 [P] [US1] Integrate Piper/Kokoro TTS for spoken answers in backend/src/services/tts.service.ts
- [ ] T026 [P] [US1] Implement frontend PDF upload UI with Tailwind CSS in frontend/src/components/Upload.tsx
- [ ] T027 [P] [US1] Implement push-to-talk voice input UI with Tailwind CSS in frontend/src/components/VoiceInput.tsx
- [ ] T028 [P] [US1] Implement answer playback and source display UI with Tailwind CSS in frontend/src/components/Answer.tsx
- [ ] T029 [US1] Add tests for PDF upload, voice Q&A, and answer playback in backend and frontend

## Phase 4: User Story 2 - OCR Document Scanning (P2)

- [ ] T030 [US2] Implement photo upload endpoint for OCR in backend/src/controllers/documents.controller.ts
- [ ] T031 [P] [US2] Integrate OCR pipeline (Faster-Whisper) in backend/src/services/ocr.service.ts
- [ ] T032 [P] [US2] Store OCR-extracted text as document in backend/src/services/documents.service.ts
- [ ] T033 [P] [US2] Index OCR documents in Milvus in backend/src/vector/vector.service.ts
- [ ] T034 [P] [US2] Implement frontend photo capture/upload UI with Tailwind CSS in frontend/src/components/OCRUpload.tsx
- [ ] T035 [US2] Add tests for OCR upload, extraction, and search in backend and frontend

## Phase 5: User Story 3 - Folder Organization (P3)

- [ ] T036 [US3] Implement Folder entity/model in backend/src/entities/folder.entity.ts
- [ ] T037 [P] [US3] Implement Folder CRUD endpoints in backend/src/controllers/folders.controller.ts
- [ ] T038 [P] [US3] Implement folder assignment for documents in backend/src/services/documents.service.ts
- [ ] T039 [P] [US3] Implement folder organization UI with Tailwind CSS in frontend/src/components/FolderTree.tsx
- [ ] T040 [US3] Add tests for folder CRUD and organization in backend and frontend

## Phase 6: User Story 4 - Folder Sharing (P4)

- [ ] T041 [US4] Implement FolderShare entity/model in backend/src/entities/folder-share.entity.ts
- [ ] T042 [P] [US4] Implement folder sharing endpoints in backend/src/controllers/folders.controller.ts
- [ ] T043 [P] [US4] Implement email validation for sharing in backend/src/services/folders.service.ts
- [ ] T044 [P] [US4] Implement shared folder access control in backend/src/guards/shared-folder.guard.ts
- [ ] T045 [P] [US4] Implement frontend sharing UI with Tailwind CSS in frontend/src/components/ShareFolder.tsx
- [ ] T046 [US4] Add tests for sharing, access control, and error cases in backend and frontend

## Phase 7: User Story 5 - Document Management (P5)

- [ ] T047 [US5] Implement RecycleBin entity/model in backend/src/entities/recycle-bin.entity.ts
- [ ] T048 [P] [US5] Implement document/folder deletion and restore endpoints in backend/src/controllers/recycle-bin.controller.ts
- [ ] T049 [P] [US5] Implement exclusion from search in backend/src/services/documents.service.ts
- [ ] T050 [P] [US5] Implement frontend recycle bin UI with Tailwind CSS in frontend/src/components/RecycleBin.tsx
- [ ] T051 [US5] Add tests for deletion, restore, exclusion, and retention in backend and frontend

## Final Phase: Polish & Cross-Cutting

- [ ] T052 [P] Add i18n (EN/DE) support in frontend and backend
- [ ] T053 [P] Add API and UI error handling for all edge cases
- [ ] T054 [P] Add health checks for all services in Docker Compose
- [ ] T055 [P] Add README and architecture diagram in root/docs/
- [ ] T056 [P] Add E2E tests for critical user journeys (optional)

## Dependencies

- User Story 1 (P1) → User Story 2 (P2) → User Story 3 (P3) → User Story 4 (P4) → User Story 5 (P5)
- Foundational tasks must be completed before any user story phase
- Setup phase must be completed before foundational

## Parallel Execution Examples

- Dockerfiles, Docker Compose, ESLint/Prettier, Vitest, Playwright, .env can be done in parallel (Setup)
- User, Folder, FolderShare, RecycleBin entities/models can be implemented in parallel (Foundational)
- PDF upload, OCR, folder CRUD, sharing, and recycle bin features can be developed/tested in parallel per user story

## Implementation Strategy

- MVP: Complete all tasks for User Story 1 (PDF upload and voice Q&A)
- Incremental: Deliver each user story as a testable, independent increment
- Polish: Add i18n, error handling, health checks, docs, and E2E after core features
