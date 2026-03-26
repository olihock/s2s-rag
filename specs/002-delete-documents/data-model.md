# Data Model: Delete Documents (Hard Delete with Milvus Cleanup)

**Feature**: `002-delete-documents`  
**Date**: 2026-03-26

---

## Schema Changes

**None.** No Prisma migrations are required for this feature. The existing schema fully supports hard delete.

---

## Affected Entities

### Document (PostgreSQL — `Document` table)

| Field        | Type             | Notes                                                                  |
| ------------ | ---------------- | ---------------------------------------------------------------------- |
| `id`         | `String` (UUID)  | Primary key; used as Milvus filter value                               |
| `ownerId`    | `String` (UUID)  | Authorization check — only owner may delete                            |
| `status`     | `DocumentStatus` | `active` / `excluded` / `recycle_bin` — delete applies to ALL statuses |
| `searchable` | `Boolean`        | Irrelevant after hard delete                                           |

**Delete operation**: `prisma.document.delete({ where: { id } })`  
**Cascade**: `owner` relation has `onDelete: Cascade` (User → Documents). This is a user-owned cascade, not triggered by document delete.  
**RecycleBin.itemId**: Plain `String`, not a FK — no cascade conflict; the `RecycleBin` entry for the deleted document must be explicitly removed (Prisma `onDelete: Cascade` is not set on this relation).

> **Action**: When `DocumentsService.hardDelete()` deletes a `Document`, any corresponding `RecycleBin` entry with `itemId = document.id` becomes an orphan. The implementation MUST also delete the `RecycleBin` entry if one exists.

### VectorEmbedding (Milvus — `documents` collection)

| Field         | Type               | Notes                                                         |
| ------------- | ------------------ | ------------------------------------------------------------- |
| `id`          | `VarChar(36)`      | UUID — primary key per chunk                                  |
| `document_id` | `VarChar(36)`      | Foreign reference to `Document.id` — used for deletion filter |
| `owner_id`    | `VarChar(36)`      | Used for search scoping, not for deletion                     |
| `chunk_text`  | `VarChar(65535)`   | Content chunk                                                 |
| `embedding`   | `FloatVector(768)` | Embedding vector                                              |

**Delete operation**: `vectorService.deleteByDocumentId(documentId)`  
**Filter**: `document_id == "${documentId}"` (Milvus expression DSL)  
**Idempotent**: Yes — if no vectors exist for the given `document_id`, Milvus `deleteEntities` does not error.

### RecycleBin (PostgreSQL — `RecycleBin` table)

| Field              | Type                 | Notes                                            |
| ------------------ | -------------------- | ------------------------------------------------ |
| `id`               | `String` (UUID)      | Primary key                                      |
| `userId`           | `String` (UUID)      | Owner                                            |
| `itemType`         | `RecycleBinItemType` | `document` or `folder`                           |
| `itemId`           | `String`             | References `Document.id` (soft reference, no FK) |
| `originalLocation` | `String`             | Folder path at time of soft-delete               |

**Impact**: When `DocumentsService.hardDelete()` deletes a document that was previously moved to the recycle bin, the corresponding `RecycleBin` entry will become orphaned. Must clean it up:

```ts
await this.prisma.recycleBin.deleteMany({
  where: { itemId: id, itemType: 'document' },
});
```

---

## Delete Flow Data Model

```
User confirms delete
        │
        ▼
DELETE /documents/:id  (HTTP)
        │
        ▼
DocumentsService.hardDelete(id, userId)
        │
        ├─ 1. prisma.document.findUnique(id)  → 404 if missing, 403 if wrong owner
        │
        ├─ 2. prisma.recycleBin.deleteMany({ itemId: id, itemType: 'document' })
        │      (cleanup orphan recycle bin entry if any)
        │
        ├─ 3. prisma.document.delete(id)
        │      (hard delete from PostgreSQL — permanent)
        │
        └─ 4. vectorService.deleteByDocumentId(id)  [fire-and-forget]
               (delete all Milvus vectors for this document_id)
               on failure → logger.warn only, HTTP 204 still returned
```

---

## State Transition

```
Document status before delete:   active | excluded | recycle_bin
                                         │
                              hard delete action
                                         │
                                         ▼
                              [Document record: GONE]
                              [Milvus vectors: GONE (best-effort)]
                              [RecycleBin entry: GONE (if any)]
```

Unlike soft-delete (which sets `status = 'recycle_bin'`), hard delete is not reversible. No status transition — the row is removed.
