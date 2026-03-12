# Data Model: PDF Voice RAG Feature

## Entities

### User
- id: string (UUID)
- email: string (unique)
- passwordHash: string
- preferredLanguage: 'en' | 'de'
- createdAt: Date
- updatedAt: Date

### Document
- id: string (UUID)
- ownerId: string (User.id)
- folderId: string (Folder.id)
- filename: string
- uploadDate: Date
- fileSize: number (bytes)
- contentText: string
- detectedLanguage: 'en' | 'de'
- searchable: boolean (excluded from search if false)
- status: 'active' | 'excluded' | 'recycle-bin'
- ocrConfidence: number (0-100, for OCR docs)
- metadata: object (extensible)

### Folder
- id: string (UUID)
- ownerId: string (User.id)
- name: string
- parentFolderId: string | null
- createdAt: Date
- updatedAt: Date

### FolderShare
- id: string (UUID)
- folderId: string (Folder.id)
- recipientUserId: string (User.id)
- permission: 'read'
- grantedAt: Date

### VoiceQuery
- id: string (UUID)
- userId: string (User.id)
- transcribedText: string
- audioFileUrl: string | null
- timestamp: Date
- searchResultIds: string[] (SearchIndex.id)

### SearchIndex
- id: string (UUID)
- documentId: string (Document.id)
- chunkText: string
- embedding: number[]
- metadata: object (chunk index, page, etc.)

### RecycleBin
- id: string (UUID)
- userId: string (User.id)
- itemType: 'document' | 'folder'
- itemId: string
- deletedAt: Date
- originalLocation: string (folderId or path)

## Relationships
- User 1---* Document
- User 1---* Folder
- Folder 1---* Document
- Folder 1---* FolderShare
- User 1---* FolderShare (as recipient)
- Document 1---* SearchIndex
- User 1---* VoiceQuery
- User 1---* RecycleBin

## Validation Rules
- Email must be valid and unique
- Only PDF/JPEG/PNG files accepted (by context)
- File size limits enforced (100MB PDF, 25MB photo)
- Folder names must be unique per user/parent
- Sharing only allowed with existing users (email validated)
- Only owners can delete/modify their documents/folders
- Recycle bin retention: 30 days
- OCR confidence <70% triggers user review
- Language: only 'en' or 'de' allowed

## State Transitions
- Document: active → excluded → active
- Document/Folder: active → recycle-bin → (restore|permanent delete)
- FolderShare: granted → revoked
