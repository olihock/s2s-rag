# Milvus Vector Schema (RAG)

## Collection: documents
- id: string (UUID)
- ownerId: string (User.id)
- folderId: string (Folder.id)
- filename: string
- uploadDate: Date
- detectedLanguage: 'en' | 'de'
- searchable: boolean
- status: 'active' | 'excluded' | 'recycle-bin'
- ocrConfidence: number (0-100, for OCR docs)
- metadata: object

## Collection: search_index
- id: string (UUID)
- documentId: string (Document.id)
- chunkText: string
- embedding: float[] (dimension=768)
- chunkIndex: int
- page: int
- language: 'en' | 'de'
- ownerId: string (User.id)

## Partitioning
- Per-user partitioning for data isolation
- Partition key: ownerId

## Indexing
- IVF_FLAT or HNSW for search_index.embedding
- Metric: cosine similarity
- Embedding dimension: 768 (sentence-transformers)

## Rationale
- Enables fast, isolated vector search for each user's documents
- Supports multi-tenant, multi-language RAG
