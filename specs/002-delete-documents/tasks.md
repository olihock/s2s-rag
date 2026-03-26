# Tasks: Delete Documents (Hard Delete with Milvus Cleanup)

**Input**: Design documents from `/specs/002-delete-documents/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/delete-document.openapi.yaml ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — this feature extends an existing codebase.

- [x] T001 Verify `VectorModule` is imported in `backend/src/app.module.ts` and `VectorService` is exported from `backend/src/vector/vector.module.ts` (read-only validation, no code change expected)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational blocking tasks — the feature adds to existing modules with no new shared infrastructure required.

_Skipped — proceed directly to user story phases._

---

## Phase 3: User Story 1 — Hard Delete from Main Page (Priority: P1) 🎯 MVP

**Goal**: Add a delete button to the document list in `App.tsx` backed by a new `DELETE /documents/:id` backend endpoint and `DocumentsService.hardDelete()` method that removes both the PostgreSQL record and Milvus vectors (best-effort).

**Independent Test**: Upload a document, confirm it appears in the list, hover and click the trash icon, confirm the dialog, verify the document disappears from the UI list, returns 404 from `GET /api/documents/:id`, and has 0 Milvus vectors for its `document_id`.

### Tests for User Story 1 ⚠️ Write and confirm FAILING before implementation

- [x] T002 [P] [US1] Write unit tests for `DocumentsService.hardDelete()` — cover: deletes document, calls `vectorService.deleteByDocumentId`, cleans up RecycleBin orphan entry, throws NotFoundException when missing, throws ForbiddenException for wrong owner, succeeds when Milvus throws, succeeds when document status is `excluded`, succeeds when document status is `recycle_bin` — in `backend/tests/unit/documents.service.spec.ts`
- [x] T003 [P] [US1] Write unit tests for `DELETE /documents/:id` route — cover: 204 on success, 403 for non-owner, 404 for missing document — in `backend/tests/unit/documents.controller.spec.ts`
- [x] T004 [P] [US1] Write frontend tests — cover: delete button renders on hover (hidden when not hovered), confirm dialog calls `deleteDocument` API, cancel dialog makes no API call, API error shows inline error message and keeps document in list — in `frontend/tests/Documents.spec.tsx` (new file)

### Implementation for User Story 1

- [x] T005 [US1] Add `hardDelete(id: string, userId: string): Promise<void>` to `backend/src/services/documents.service.ts`: (1) `findUnique` with 404/403 guards, (2) `prisma.recycleBin.deleteMany({ where: { itemId: id, itemType: 'document' } })`, (3) `prisma.document.delete({ where: { id } })`, (4) fire-and-forget `vectorService.deleteByDocumentId(id).catch(...)` — depends on T002
- [x] T006 [US1] Add `@Delete(':id')` endpoint to `backend/src/controllers/documents.controller.ts` — import `Delete` and `HttpCode` from `@nestjs/common`, decorate with `@HttpCode(204)`, add `@ApiOperation` summary, call `documentsService.hardDelete(id, user.id)`, return HTTP 204 — depends on T005
- [x] T007 [P] [US1] Add `deleteDocument(id: string): Promise<void>` function to `frontend/src/services/api.ts` — `api.delete(\`/documents/${id}\`)` using existing Axios instance
- [x] T008 [US1] Add delete button + confirmation + handler to the documents tab list in `frontend/src/App.tsx`: (1) add `deleteError` state (`useState<string | null>(null)`), (2) add `handleDeleteDocument(id)` async function with `window.confirm`, call `deleteDocument(id)`, on success filter document from state, on error set `deleteError`, (3) add hover-reveal trash icon button beside each document row, (4) render `deleteError` as `<p className="text-sm text-red-600">` near the list — depends on T007

**Checkpoint**: User Story 1 complete. Verify with `quickstart.md` Scenario 1 & 2 & 3. All T002–T004 tests should pass.

---

## Phase 4: User Story 2 — Fix RecycleBin permanentDelete Milvus Cleanup (Priority: P2)

**Goal**: Inject `VectorService` into `RecycleBinService` and call `deleteByDocumentId` inside the existing `permanentDelete()` method so that permanent deletion from the recycle bin also removes Milvus vectors — closing an existing data-integrity gap. No new UI required.

**Independent Test**: Move a document to the recycle bin, trigger `DELETE /api/recycle-bin/:id` (permanent delete), verify the RecycleBin entry is gone, the Document record is gone, and Milvus has 0 vectors for that `document_id`.

### Tests for User Story 2 ⚠️ Write and confirm FAILING before implementation

- [x] T009 [US2] Add unit tests to `backend/tests/unit/recycle-bin.service.spec.ts` — cover: `permanentDelete()` calls `vectorService.deleteByDocumentId` for `document` item type, succeeds when Milvus throws (best-effort), does NOT call `deleteByDocumentId` for `folder` item type

### Implementation for User Story 2

- [x] T010 [US2] Inject `VectorService` into `RecycleBinService` in `backend/src/services/recycle-bin.service.ts`: (1) update constructor to accept `private readonly vectorService: VectorService`, (2) add import for `VectorService`, (3) in `permanentDelete()` after `prisma.document.delete()`, add fire-and-forget `this.vectorService.deleteByDocumentId(item.itemId).catch(...)` guarded by `if (item.itemType === 'document')` — depends on T009

**Checkpoint**: User Story 2 complete. Verify with `quickstart.md` Scenario 4. All T009 tests should pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T011 [P] Add `@ApiOperation`, `@ApiResponse(204)`, `@ApiResponse(403)`, `@ApiResponse(404)` Swagger decorators to the new `DELETE /documents/:id` endpoint in `backend/src/controllers/documents.controller.ts`
- [ ] T012 [P] Run `quickstart.md` full validation (all 4 scenarios) against the running Docker Compose stack

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 3 (US1)**: Depends on Phase 1 (T001 validation)
- **Phase 4 (US2)**: Independent from Phase 3 — can start in parallel after Phase 1
- **Phase 5 (Polish)**: Depends on Phase 3 and Phase 4 completion

### User Story Dependencies

- **User Story 1 (P1)**: Independent — backend and frontend can be developed in parallel (T002–T004 tests, then T005–T008 impl)
- **User Story 2 (P2)**: Independent from US1 — only touches `RecycleBinService`

### Within Each User Story

```
Tests (T002–T004 / T009) — write FIRST, confirm FAILING
         ↓
Backend service (T005 / T010)
         ↓
Backend controller (T006)  ←→  Frontend API service (T007) [parallel]
         ↓
Frontend App.tsx (T008)
```

### Parallel Opportunities

**User Story 1 — can run in parallel:**

```
T002 (backend service tests)        T003 (controller tests)        T004 (frontend tests)
        ↓                                   ↓                              ↓
T005 (DocumentsService.hardDelete)  T006 (controller endpoint)     T007 (api.ts deleteDocument)
                                                                           ↓
                                                                    T008 (App.tsx UI)
```

**User Story 2 in parallel with US1 polish:**

```
T009 (recycle-bin tests) → T010 (RecycleBinService fix)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 — verify DI setup
2. T002, T003, T004 — write tests (all should FAIL)
3. T005 — implement `hardDelete()`
4. T006, T007 — implement endpoint + frontend API fn (parallel)
5. T008 — implement delete UI in `App.tsx`
6. **STOP and VALIDATE**: Run tests, smoke test with quickstart Scenarios 1–3

### Full Delivery (Both Stories)

7. T009 — write recycle-bin tests (should FAIL)
8. T010 — fix `RecycleBinService.permanentDelete()`
9. T011, T012 — polish + full quickstart validation

---

## Notes

- Constitution Principle III (TDD) is **NON-NEGOTIABLE** — T002–T004 and T009 MUST be written and confirmed FAILING before T005–T008 and T010
- No Prisma migration is needed — hard delete works with the existing schema
- `VectorService.deleteByDocumentId()` already exists — do NOT create a new method
- RecycleBin orphan cleanup (`prisma.recycleBin.deleteMany`) belongs in `DocumentsService.hardDelete()`, not the controller
- Milvus cleanup is always fire-and-forget — never `await` it in the synchronous delete path
