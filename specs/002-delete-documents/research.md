# Research: Delete Documents (Hard Delete with Milvus Cleanup)

**Feature**: `002-delete-documents`  
**Date**: 2026-03-26  
**Phase**: 0 — Unknowns resolved before design

---

## Finding 1: VectorService.deleteByDocumentId already exists

**Decision**: Use the existing `deleteByDocumentId(documentId: string)` method in `VectorService` for all Milvus cleanup.

**Evidence**:

```ts
// backend/src/vector/vector.service.ts (lines 163–167)
async deleteByDocumentId(documentId: string): Promise<void> {
  await this.client.deleteEntities({
    collection_name: DOCUMENTS_COLLECTION,
    filter: `document_id == "${documentId}"`,
  });
}
```

**Rationale**: The method already exists and uses the correct Milvus filter DSL. No changes to `VectorService` are needed. It silently succeeds if no matching vectors exist (Milvus `deleteEntities` does not error on empty result sets).

**Alternatives considered**: Writing a new `deleteVectorsByDocumentId` wrapper — rejected, unnecessary duplication.

---

## Finding 2: No DELETE endpoint exists on DocumentsController

**Decision**: Add `DELETE /documents/:id` to `DocumentsController`.

**Evidence**: `backend/src/controllers/documents.controller.ts` only has `POST`, `GET`, `PATCH` methods. No `@Delete` decorator exists. The NestJS `Delete` decorator is available from `@nestjs/common` but not currently imported.

**Rationale**: A dedicated `DELETE` endpoint follows REST semantics and the API-First constitution principle. The existing `POST /recycle-bin/move` endpoint is for soft-delete which this feature bypasses.

**Alternatives considered**: Re-using `PATCH /documents/:id/exclude` with a `deleted` flag — rejected, this is a soft-delete pattern and the spec explicitly requires hard delete.

---

## Finding 3: DocumentsService has no hardDelete method

**Decision**: Add `async hardDelete(id: string, userId: string): Promise<void>` to `DocumentsService`.

**Evidence**: `DocumentsService` only has `uploadPdf`, `listDocuments`, `findById`, `excludeFromSearch`, `reEnableSearch`. No delete method exists.

**Implementation pattern** (modelled on existing owner-check pattern):

```ts
async hardDelete(id: string, userId: string): Promise<void> {
  const doc = await this.prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundException('Document not found');
  if (doc.ownerId !== userId) throw new ForbiddenException();

  await this.prisma.document.delete({ where: { id } });
  // Best-effort Milvus cleanup
  this.vectorService.deleteByDocumentId(id).catch((err: unknown) =>
    this.logger.warn(`Milvus cleanup failed for document ${id}`, err),
  );
}
```

**Rationale**: Consistent with `excludeFromSearch` ownership check pattern. Milvus cleanup is fire-and-forget (best-effort per Q2 answer) — DB delete always succeeds first.

---

## Finding 4: RecycleBinService.permanentDelete does not clean up Milvus

**Decision**: Inject `VectorService` into `RecycleBinService` and call `deleteByDocumentId` inside `permanentDelete`.

**Evidence**:

```ts
// backend/src/services/recycle-bin.service.ts — constructor
constructor(private readonly prisma: PrismaService) {}
// No VectorService injection. permanentDelete only calls prisma.document.delete().
```

**Implementation**:

```ts
// Add to RecycleBinService constructor
constructor(
  private readonly prisma: PrismaService,
  private readonly vectorService: VectorService,
) {}

// In permanentDelete(), after prisma.document.delete():
this.vectorService.deleteByDocumentId(item.itemId).catch((err: unknown) =>
  this.logger.warn(`Milvus cleanup failed for ${item.itemId}`, err),
);
```

**Dependency**: `VectorService` is exported from `VectorModule`. `RecycleBinService` lives in `app.module`'s providers; need to verify `VectorModule` is imported in `AppModule`. It is — confirmed by checking `app.module.ts`.

**Rationale**: Closes the existing data-integrity gap without adding any new dependencies beyond the already-loaded DI token.

---

## Finding 5: Frontend uses inline error state, no toast library

**Decision**: Use inline `useState<string | null>` error in `App.tsx` for delete failure messages, consistent with existing pattern in `RecycleBin.tsx`, `Upload.tsx`, etc. Display the error near the document list.

**Evidence**: No toast/notification library (`react-hot-toast`, `sonner`, etc.) is installed. All error UI in the codebase is inline `text-red-600` text rendered from `useState`.

**Rationale**: Adding a toast library for a single use case violates the constitution's "avoid over-engineering" spirit. Inline error is sufficient and consistent.

---

## Finding 6: Confirmation dialog pattern

**Decision**: Use `window.confirm()` for the irreversible-action confirmation dialog, consistent with existing `RecycleBin.tsx` pattern.

**Evidence**:

```ts
// RecycleBin.tsx
if (!confirm('Permanently delete this item? This cannot be undone.')) return;
```

**Rationale**: Already established UX pattern in the codebase. Avoids adding a modal component for a single use case.

---

## Finding 7: No database migration needed

**Decision**: No Prisma migration required.

**Evidence**: The `Document` model in `schema.prisma` already supports hard delete via Prisma's `document.delete()`. PostgreSQL `ON DELETE CASCADE` is set for related records (`owner` relation). There are no foreign keys pointing _to_ `Document` that would block deletion — `RecycleBin.itemId` is a plain `String` (not a FK), so no cascade conflict.

**Rationale**: Zero schema changes = zero migration risk.

---

## Finding 8: Delete button placement in App.tsx

**Decision**: Add a trash icon button as a hover-revealed action on each document row in the `activeTab === 'documents'` list inside `App.tsx`, following the same pattern as folder delete in `FolderTree.tsx`.

**Evidence** (`FolderTree.tsx`):

```tsx
<button
  onClick={(e) => { e.stopPropagation(); void onDeleteFolder(folder.id); }}
  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ..."
>
```

**Rationale**: Consistent UX pattern. Hover-reveal prevents accidental clicks on dense lists.

---

## Summary Table

| Unknown                                                   | Resolution                                             |
| --------------------------------------------------------- | ------------------------------------------------------ |
| Does `VectorService.deleteByDocumentId` exist?            | ✅ Yes, already implemented, no changes needed         |
| Does `DocumentsController` have `DELETE /documents/:id`?  | ❌ Missing — must add                                  |
| Does `DocumentsService` have a `hardDelete()` method?     | ❌ Missing — must add                                  |
| Does `RecycleBinService.permanentDelete` clean up Milvus? | ❌ Gap — must fix by injecting VectorService           |
| Is VectorModule available in AppModule DI?                | ✅ Yes, confirmed in app.module.ts                     |
| Toast library available?                                  | ❌ None — use inline error state (existing pattern)    |
| Confirmation pattern?                                     | ✅ `window.confirm()` — matches RecycleBin.tsx         |
| DB migration required?                                    | ❌ Not needed — hard delete works with existing schema |
