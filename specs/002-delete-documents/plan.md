# Implementation Plan: Delete Documents (Hard Delete with Milvus Cleanup)

**Branch**: `002-delete-documents` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-delete-documents/spec.md`

## Summary

Add a hard-delete action to the main document list that permanently removes the document record from PostgreSQL **and** all associated embedding vectors from Milvus. A confirmation dialog guards the irreversible action. Additionally, fix the existing `RecycleBinService.permanentDelete()` to also clean up Milvus vectors, closing an existing data-integrity gap.

No new data models or database migrations are required. The implementation touches: backend controller (new `DELETE /documents/:id` endpoint), `DocumentsService` (new `hardDelete()` method), `RecycleBinService` (inject `VectorService`, call `deleteByDocumentId`), and the React frontend (`App.tsx` delete button + confirmation dialog, `api.ts` new `deleteDocument()` call).

## Technical Context

**Language/Version**: TypeScript ES2022+ (Node.js 20 LTS backend, Vite 5 frontend)  
**Primary Dependencies**: NestJS (backend), React 18 + Vite (frontend), @zilliz/milvus2-sdk-node, Prisma ORM  
**Storage**: PostgreSQL 15 (Prisma) + Milvus 2.3 (vector embeddings)  
**Testing**: Vitest (unit + integration), Playwright (E2E, optional)  
**Target Platform**: Linux server (Docker Compose)  
**Project Type**: Web application (NestJS backend + React/Vite frontend)  
**Performance Goals**: Delete response ≤500ms (P95); Milvus cleanup best-effort, non-blocking  
**Constraints**: Milvus unavailability MUST NOT block DB delete; delete MUST be owner-only (HTTP 403 otherwise)  
**Scale/Scope**: Single-user and multi-user RAG; existing codebase, minimal surface change

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                                                                             | Status  | Notes                                                                                                                  |
| --- | ------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| I   | API-First — `DELETE /documents/:id` endpoint required, contract before implementation | ✅ PASS | Contract defined in `contracts/delete-document.yaml`                                                                   |
| II  | Type Safety — TypeScript strict throughout, no `any`                                  | ✅ PASS | New service method and API types will be fully typed                                                                   |
| III | TDD (NON-NEGOTIABLE) — tests written before implementation                            | ✅ PASS | Unit tests for `DocumentsService.hardDelete()` and `RecycleBinService.permanentDelete()` fixture must be written first |
| IV  | Local-First AI — not applicable                                                       | ✅ N/A  | No AI components involved                                                                                              |
| V   | Container-Based — no new services                                                     | ✅ PASS | No new containers; existing Milvus + PostgreSQL containers used                                                        |
| VI  | Real-Time Audio — not applicable                                                      | ✅ N/A  | Not an audio feature                                                                                                   |

**Gate result: PASS — no violations. Phase 0 may proceed.**

## Project Structure

### Documentation (this feature)

```text
specs/002-delete-documents/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── delete-document.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   └── documents.controller.ts     # ADD: DELETE /documents/:id endpoint
│   ├── services/
│   │   ├── documents.service.ts        # ADD: hardDelete(id, userId) method
│   │   └── recycle-bin.service.ts      # FIX: inject VectorService, call deleteByDocumentId in permanentDelete()
│   └── vector/
│       └── vector.service.ts           # EXISTING: deleteByDocumentId(documentId) - no changes needed
└── tests/
    └── unit/
        ├── documents.service.spec.ts   # ADD: hardDelete tests
        └── recycle-bin.service.spec.ts # ADD: permanentDelete vector cleanup tests

frontend/
├── src/
│   ├── App.tsx                         # ADD: delete button in document list + confirmation dialog + handler
│   └── services/
│       └── api.ts                      # ADD: deleteDocument(id) function
└── tests/
    └── Documents.spec.tsx              # NEW: delete flow tests (dedicated file)
```

**Structure Decision**: Web application (Option 2). No new files/modules; changes confined to existing service, controller, and frontend files. No migrations required.

## Complexity Tracking

> No constitution violations — table not required.
