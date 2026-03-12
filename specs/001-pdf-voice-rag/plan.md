# Implementation Plan: PDF Document Management with Voice-Based RAG Search

**Branch**: `001-pdf-voice-rag` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pdf-voice-rag/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

**Primary Requirement:**
Enable users to upload, scan (OCR), organize, and share PDF/physical documents, and ask voice questions about their own or shared documents, with answers generated and spoken using local AI (RAG) and all processing performed locally (no external APIs). Support both English and German for Q&A and UI.

**Technical Approach:**
- Backend: NestJS (TypeScript), REST API, all endpoints documented via OpenAPI/Swagger, containerized.
- Frontend: React (TypeScript), Vite, Tailwind CSS (mandatory for all UI), API-first, voice input/output, real-time streaming audio.
- Vector Search: Milvus 2.3+ (containerized), Zilliz SDK for all vector operations, persistent volumes for storage.
- AI: Faster-Whisper (STT), Ollama (LLM), Piper/Kokoro (TTS), Pipecat (audio pipeline), all running locally in containers.
- Testing: Vitest (unit/integration), Playwright (optional E2E), ≥80% coverage, TDD enforced.
- Security: Multi-user, folder/document sharing, access control, no direct DB access from frontend.
- Internationalization: English and German support for all user-facing features.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (ES2022+), Node.js 20+ LTS, React 18+
**Primary Dependencies**: NestJS, React, Vite, Tailwind CSS, @zilliz/milvus2-sdk-node, Faster-Whisper, Ollama, Piper/Kokoro, Pipecat, class-validator, class-transformer, Axios or Fetch, ESLint, Prettier, Husky, lint-staged, Vitest
**Storage**: Milvus 2.3+ (vector database, Zilliz SDK), PostgreSQL 15+ (relational/metadata, Prisma ORM), persistent volumes (Docker)
**Testing**: Vitest (unit/integration), Playwright (optional E2E), built-in mocks
**Target Platform**: Linux server (backend), modern browsers (frontend), Docker Compose (all services)
**Project Type**: Full-stack web application (API-first, RAG, real-time audio)
**Performance Goals**: End-to-end audio Q&A ≤2s for short queries; ≥80% test coverage; real-time streaming audio
**Constraints**: Local-only AI (no external APIs), containerized, type-safe, offline-capable, no direct DB access from frontend, API versioning, ≥80% code coverage, health checks, .env config, German+English support, Tailwind CSS required for all frontend UI
**Scale/Scope**: Multi-user, multi-tenant, folder/document sharing, OCR, voice Q&A, scalable to 10k+ users, 100k+ documents, 1M+ vectors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*


**Gates (from S2S-RAG Constitution v2.2.0):**

1. **API-First**: Satisfied (OpenAPI contract, NestJS REST endpoints, no direct DB access from frontend)
2. **Type Safety**: Satisfied (TypeScript everywhere, shared types, no type assertions)
3. **Test-Driven Development**: Satisfied (Vitest, Red-Green-Refactor, test tasks precede implementation in each phase, ≥80% coverage, integration tests planned)
4. **Local-First AI**: Satisfied (Faster-Whisper, Ollama, Piper/Kokoro, Pipecat, all local)
5. **Container-Based Deployment**: Satisfied (Docker Compose for all services, Milvus and PostgreSQL with persistent volumes, .env config, health checks)
6. **Real-Time Audio**: Satisfied (streaming audio, Pipecat, STT/TTS streaming, latency targets, error handling)
7. **Technology Stack**: Satisfied (Milvus, Zilliz SDK, PostgreSQL 15+, Prisma ORM, NestJS, React, Vite, Tailwind CSS, Vitest, ESLint, Prettier, Husky, lint-staged, Playwright, class-validator, class-transformer)
8. **Documentation**: Satisfied (spec, OpenAPI, quickstart, vector schema, agent context)
9. **Branching/Workflow**: Satisfied (feature branch `001-pdf-voice-rag` created, PR/test/lint/coverage, code review, versioning)
10. **Compliance**: Satisfied (all gates checked, no violations)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── auth/            # JWT authentication
│   ├── controllers/     # REST endpoints (documents, folders, voice, recycle-bin)
│   ├── db/              # Prisma / PostgreSQL setup
│   ├── entities/        # User, Document, Folder, FolderShare, RecycleBin models
│   ├── guards/          # Access control guards
│   ├── jobs/            # Scheduled jobs (recycle-bin cleanup)
│   ├── middleware/       # Error handling, validation
│   ├── services/        # Business logic (documents, folders, STT, LLM, TTS, OCR)
│   ├── types/           # Shared TypeScript types / DTOs
│   └── vector/          # Milvus / Zilliz SDK integration
├── tests/
│   ├── integration/
│   └── unit/
├── main.ts              # NestJS bootstrap + Swagger setup
└── Dockerfile

frontend/
├── src/
│   ├── components/      # Upload, VoiceInput, Answer, OCRUpload, FolderTree,
│   │                    #   ShareFolder, RecycleBin, LanguageSettings
│   ├── pages/
│   ├── services/        # API client calls
│   └── types/           # Shared types (mirrors backend DTOs)
├── tests/
├── index.html
└── Dockerfile

specs/001-pdf-voice-rag/ # Feature documentation (this plan and related files)
docker-compose.yml       # All services: backend, frontend, Milvus, PostgreSQL, AI
.env.example
```

**Structure Decision**: Web application layout (Option 2) — separate `backend/` (NestJS) and `frontend/` (React + Vite + Tailwind CSS) directories. Milvus handles vector storage; PostgreSQL handles relational/metadata.

## Complexity Tracking

> No constitution violations to justify.
