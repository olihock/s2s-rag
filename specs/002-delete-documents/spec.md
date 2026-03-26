# Feature Specification: Delete Documents (Hard Delete with Milvus Cleanup)

**Feature Branch**: `002-delete-documents`  
**Created**: 2026-03-26  
**Status**: Draft  
**Input**: User description: "Als User möchte ich die Möglichkeit haben, Dokumente auf der Hauptseite zu löschen. Die Inhalten sollen beim Löschen komplett entfernt werden, also sowohl das Dokument selbst in der Tabelle als auch die generierten Embeddings aus der Vektordatenbank, Milvus."

## Clarifications

### Session 2026-03-26

- Q: Does deleting a document from the main page bypass the recycle bin entirely (immediate hard delete), or should it first move to the recycle bin with a separate permanent-delete step from there? → A: Direct hard delete — confirmation dialog only, no recycle bin step; document and vectors are permanently removed immediately
- Q: If Milvus is unavailable when a delete is confirmed, what should the system do? → A: Best-effort — DB delete always proceeds; Milvus cleanup is attempted and any failure is logged (no retry queue)
- Q: When a user deletes a document that lives in a folder shared with other users, what should happen? → A: Owner can always delete their own document; shared users immediately lose access (no warning). Note: folder sharing feature is not yet functional — this constraint is non-blocking for the current implementation.
- Q: Should the delete action be scoped only to documents the user owns, or should users with shared read access also be able to delete documents? → A: Only the document owner can delete; shared-access users have no delete capability
- Q: If the backend delete request fails (e.g. network error, server error), how should the UI respond? → A: Show inline error notification (toast) without removing the document from the list; no optimistic removal

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Hard Delete a Document from the Main Page (Priority: P1)

A logged-in user sees a delete action next to each document in the main document list. When triggered, a confirmation dialog appears warning that the action is irreversible. Upon confirmation, the system permanently removes the document record from the database **and** all associated embedding vectors from Milvus, ensuring no data remnants remain.

**Why this priority**: This is the sole deliverable of the feature. Without it, the feature has no value. The complete end-to-end flow (UI action → backend delete → DB + Milvus cleanup) must work atomically to prevent orphaned data.

**Independent Test**: Can be fully tested by uploading a document, confirming it appears in the list and in Milvus, pressing the delete button, confirming the dialog, then verifying the document is gone from the list, from the database, and its embeddings are absent from Milvus.

**Acceptance Scenarios**:

1. **Given** a user is logged in and has at least one document, **When** they view the main document list, **Then** a delete action is visible (revealed on hover) for each document they own
2. **Given** the user clicks delete on a document, **When** the confirmation dialog appears, **Then** the user can either confirm or cancel the deletion
3. **Given** the user confirms deletion, **When** the backend processes the request, **Then** the document record is permanently removed from the PostgreSQL table
4. **Given** the user confirms deletion, **When** the backend processes the request, **Then** all Milvus embedding vectors with `document_id` matching the deleted document are removed
5. **Given** a deletion is in progress, **When** the operation completes, **Then** the document disappears from the UI document list without requiring a page reload
6. **Given** the user cancels the confirmation dialog, **When** the dialog closes, **Then** the document remains unchanged
7. **Given** a deletion is attempted on a document the user does not own, **When** the backend receives the request, **Then** it returns 403 Forbidden and no data is deleted

---

### User Story 2 - Fix Permanent Delete from Recycle Bin to Also Remove Milvus Vectors (Priority: P2)

The existing recycle bin already supports permanent deletion. However, the `RecycleBinService.permanentDelete()` does not currently remove Milvus embedding vectors. As part of delivering complete data removal, this gap must be closed so that permanent delete via the recycle bin also cleans up Milvus.

**Note**: This user story does NOT add a new UI flow — it fixes and hardens an existing code path. The main deletion UX (User Story 1) is a direct hard delete that bypasses the recycle bin entirely.

**Why this priority**: The existing `permanentDelete` in `RecycleBinService` already deletes from PostgreSQL but **does not** delete Milvus vectors — this is a gap that must be fixed as part of this feature to ensure complete data removal.

**Independent Test**: Can be tested by moving a document to the recycle bin, then invoking permanent delete from the recycle bin view, and verifying the document is absent from both the DB and Milvus.

**Acceptance Scenarios**:

1. **Given** a document is in the recycle bin, **When** the user triggers permanent delete, **Then** the recycle bin entry is removed
2. **Given** permanent delete is triggered, **When** the backend processes it, **Then** the document DB record is deleted
3. **Given** permanent delete is triggered, **When** the backend processes it, **Then** all Milvus embedding vectors for that `document_id` are deleted
4. **Given** permanent delete is triggered and Milvus is unavailable, **When** the backend processes it, **Then** the delete still succeeds and the Milvus failure is logged as a warning

---

### Edge Cases

- If Milvus is temporarily unavailable when a delete is confirmed, the DB delete proceeds and succeeds; the Milvus cleanup is attempted, and any failure is logged as a warning (best-effort, no retry queue). Orphaned vectors without a corresponding DB record are benign.
- When the user deletes a document that is in a shared folder, the delete succeeds without warning; shared users immediately lose access to that document. (Folder sharing is not yet implemented — this edge case is noted for future reference only.)
- If the document has no embeddings in Milvus (e.g., extraction failed, document was excluded from indexing), the delete still succeeds; missing vectors are not treated as an error.
- If the backend delete request fails (network error, 5xx), the UI displays an error toast and the document remains in the list unchanged; no optimistic removal.
- If a concurrent query is in flight at the moment of deletion, the query completes with whatever data Milvus returns; no special handling is required at the delete side.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to initiate a **direct hard delete** (bypassing the recycle bin entirely) of any document they own from the main document list
- **FR-002**: System MUST display a confirmation dialog before executing a permanent delete, clearly stating the action is irreversible
- **FR-003**: On confirmed deletion, system MUST permanently remove the document record from the PostgreSQL `Document` table
- **FR-004**: On confirmed deletion, system MUST attempt to delete all Milvus embedding vectors whose `document_id` matches the deleted document; if Milvus is unavailable, the failure MUST be logged as a warning and the overall delete operation MUST still return success
- **FR-005**: System MUST reject delete requests for documents not owned by the requesting user (HTTP 403); shared-access users (read-only) have no delete capability on any document
- **FR-006**: System MUST return HTTP 404 if the document does not exist at the time of the delete request
- **FR-007**: Deletion MUST also propagate to the Milvus vector store even if the document previously had status `excluded` or `recycle_bin` (i.e., embeddings may still exist)
- **FR-008**: The existing `RecycleBinService.permanentDelete()` MUST be extended to also remove Milvus vectors so all permanent-delete code paths are covered
- **FR-009**: System MUST update the UI document list immediately after successful deletion (remove from list on confirmed server response, not optimistically)
- **FR-010**: System MUST handle the case where Milvus has no vectors for a given document ID without treating it as an error
- **FR-011**: If the backend delete request fails, the UI MUST display an error toast notification and keep the document visible in the list; no optimistic removal is applied
- **FR-012**: When a document in a shared folder is deleted by its owner, the deletion MUST proceed without any sharing-related warning or blocking; shared users lose access immediately as a consequence (non-blocking for current implementation — folder sharing is not yet functional)

### Key Entities

- **Document**: PostgreSQL record. Attributes: `id`, `ownerId`, `folderId`, `filename`, `status`, `searchable`, `contentText`. Deletion is permanent (hard delete via `DELETE`).
- **VectorEmbedding** (Milvus): Embedding chunks stored in the `documents` collection. Filtered by `document_id` for deletion. A single document produces N chunks; all must be removed.
- **RecycleBin**: PostgreSQL record tracking soft-deleted items. When permanent delete is invoked from recycle bin, this entry and the related `Document` record + Milvus vectors must all be cleaned up.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After a confirmed deletion, 0 records with the deleted `document_id` exist in the PostgreSQL `Document` table
- **SC-002**: After a confirmed deletion, 0 Milvus vectors with `document_id` matching the deleted document are returned by a Milvus query
- **SC-003**: The deleted document no longer appears in the UI document list within 2 seconds of the delete confirmation
- **SC-004**: Delete requests for documents owned by a different user result in HTTP 403 with no data modification
- **SC-005**: If the document had no Milvus vectors (e.g., extraction failed), the delete operation still completes successfully (HTTP 200/204)
