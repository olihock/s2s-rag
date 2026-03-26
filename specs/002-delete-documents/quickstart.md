# Quickstart: Delete Documents (Hard Delete with Milvus Cleanup)

**Feature**: `002-delete-documents`  
**Date**: 2026-03-26

## Pre-conditions

- Docker Compose stack running (`docker compose up -d`)
- A registered user account exists
- At least one document has been uploaded and indexed (Milvus vectors present)
- JWT access token available (obtained via `POST /api/auth/login`)

---

## Scenario 1: Happy Path — Delete a document from the main page

1. **Open the app** → navigate to the Documents tab
2. **Observe**: Document row is visible in the list; no delete button visible yet
3. **Hover over a document row** → a trash icon button appears on the right
4. **Click the trash icon** → `window.confirm` dialog appears: _"Permanently delete this document? This action cannot be undone."_
5. **Click OK** → document disappears from the list
6. **Verify**: Reload the page → document is gone from the list
7. **Verify backend**: `GET /api/documents` returns no entry with the deleted ID
8. **Verify Milvus** _(optional, for integration test)_: Query Milvus with `document_id == "<deleted-id>"` returns 0 results

---

## Scenario 2: Cancel deletion

1. Hover over a document, click the trash icon
2. **Click Cancel** on the confirm dialog
3. **Observe**: Document remains in the list unchanged; no API call made

---

## Scenario 3: Delete fails (network/server error)

1. Disconnect from network or stop the backend container
2. Hover over a document, click the trash icon, confirm
3. **Observe**: Document stays in the list; an inline red error message appears near the list

---

## Scenario 4: Permanent delete from recycle bin also cleans up Milvus

1. Move a document to the recycle bin via `POST /api/recycle-bin/move`
2. Navigate to the Recycle Bin tab
3. Click "Delete permanently" on the item
4. **Verify**: Item is gone from the recycle bin
5. **Verify**: `GET /api/documents` does not return the document
6. **Verify Milvus**: `document_id == "<deleted-id>"` query returns 0 results

---

## API Quick Test (curl)

```bash
# Authenticate
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | jq -r '.access_token')

# List documents and pick an ID
DOC_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/documents | jq -r '.[0].id')

# Hard-delete the document
curl -s -X DELETE http://localhost:3000/api/documents/$DOC_ID \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP status: %{http_code}\n"
# Expected: HTTP status 204

# Confirm it's gone
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/documents/$DOC_ID \
  -w "\nHTTP status: %{http_code}\n"
# Expected: HTTP status 404
```

---

## Expected Vitest Tests

| Test file                                        | Test case                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `backend/tests/unit/documents.service.spec.ts`   | `hardDelete()` — removes document from DB                                       |
| `backend/tests/unit/documents.service.spec.ts`   | `hardDelete()` — calls vectorService.deleteByDocumentId                         |
| `backend/tests/unit/documents.service.spec.ts`   | `hardDelete()` — cleans up RecycleBin entry if exists                           |
| `backend/tests/unit/documents.service.spec.ts`   | `hardDelete()` — throws NotFoundException if document missing                   |
| `backend/tests/unit/documents.service.spec.ts`   | `hardDelete()` — throws ForbiddenException if wrong owner                       |
| `backend/tests/unit/documents.service.spec.ts`   | `hardDelete()` — succeeds when Milvus throws (best-effort)                      |
| `backend/tests/unit/recycle-bin.service.spec.ts` | `permanentDelete()` — calls vectorService.deleteByDocumentId for document items |
| `backend/tests/unit/recycle-bin.service.spec.ts` | `permanentDelete()` — succeeds when Milvus throws (best-effort)                 |
| `frontend/tests/Upload.spec.tsx` _(or new spec)_ | Delete button renders for owned documents                                       |
| `frontend/tests/Upload.spec.tsx` _(or new spec)_ | Confirm dialog → calls deleteDocument API                                       |
| `frontend/tests/Upload.spec.tsx` _(or new spec)_ | Cancel dialog → no API call                                                     |
| `frontend/tests/Upload.spec.tsx` _(or new spec)_ | API error → inline error message shown, document remains                        |
