# Quickstart: PDF Voice RAG Feature

## Prerequisites
- Docker 24+
- Node.js 20+ LTS
- Yarn or npm
- Milvus 2.3+ (containerized)
- Ollama, Faster-Whisper, Piper/Kokoro, Pipecat (all containerized)

## Setup
1. Clone repository and checkout branch `001-pdf-voice-rag`
2. Copy `.env.example` to `.env` and configure secrets/paths
3. Run `docker compose up -d` to start Milvus, AI services, backend, frontend
4. Install dependencies: `yarn install` (or `npm install`)
5. Run backend: `yarn start:backend` (or via Docker)
6. Run frontend: `yarn start:frontend` (or via Docker)

## Usage
- Register/login via frontend
- Upload PDF or scan photo for OCR
- Organize documents in folders
- Share folders by email
- Ask questions via push-to-talk (voice)
- Receive spoken answers and visual citations
- Manage deleted items in recycle bin

## Testing
- Run all tests: `yarn test` (Vitest)
- Coverage: `yarn coverage`
- Lint: `yarn lint`

## Notes
- All AI runs locally (no external APIs)
- Milvus vector DB stores all document embeddings
- English and German fully supported
- See `/specs/001-pdf-voice-rag/contracts/` for API and vector schema
