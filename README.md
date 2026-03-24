# PDF Voice RAG

**Bilingual PDF document management with voice-based RAG search (English & German)**

## Features

| User Story | Feature                                                                          | Priority |
| ---------- | -------------------------------------------------------------------------------- | -------- |
| US1        | PDF upload + voice Q&A (STT → semantic search → LLM → TTS)                       | P1       |
| US2        | OCR photo scanning (JPEG/PNG → Faster-Whisper → Milvus)                          | P2       |
| US3        | Folder organisation (CRUD, nested, document assignment)                          | P3       |
| US4        | Folder sharing (share by email, access-control guard, revoke)                    | P4       |
| US5        | Document management (exclude/re-enable search, recycle bin, 30-day auto-cleanup) | P5       |

---

## Architecture

```
                     ┌─────────────────────────┐
                     │        Browser          │
                     │  React 18 + Tailwind CSS│
                     │  (Vite dev / nginx prod) │
                     └────────────┬────────────┘
                                  │ REST / multipart
                     ┌────────────▼────────────┐
                     │     NestJS Backend       │
                     │  JWT Auth · Swagger docs  │
                     │  /api prefix · port 3000  │
                     └──┬─────────┬─────────┬──┘
                        │         │         │
          ┌─────────────▼─┐  ┌────▼────┐  ┌▼──────────────┐
          │  PostgreSQL 15 │  │Milvus 2 │  │  AI Services  │
          │  (Prisma ORM)  │  │(vector  │  ├───────────────┤
          │  Users         │  │ search) │  │Faster-Whisper │
          │  Documents     │  │COSINE   │  │  (STT :9000)  │
          │  Folders       │  │768-dim  │  ├───────────────┤
          │  FolderShares  │  │per-user │  │  Ollama LLM   │
          │  VoiceQueries  │  │isolation│  │ (llama3:11434)│
          │  RecycleBin    │  └─────────┘  ├───────────────┤
          └────────────────┘               │  Piper TTS    │
                                           │  (de/en:10200)│
                                           └───────────────┘
```

### Voice Q&A pipeline

```
Audio blob → POST /api/documents/:id/query
  → Faster-Whisper STT   (speech-to-text, language detection)
  → Ollama nomic-embed   (query embedding, 768-dim)
  → Milvus semantic search  (top-5 chunks, per-user filter)
  → Ollama llama3 generate  (bilingual prompt with context)
  → Piper TTS            (synthesise spoken answer)
  ← { question, answer, audioBase64, sources[] }
```

---

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Backend       | NestJS 10, TypeScript, Passport/JWT           |
| Frontend      | React 18, Vite 5, Tailwind CSS, i18next       |
| Relational DB | PostgreSQL 15, Prisma 5                       |
| Vector DB     | Milvus 2.4, @zilliz/milvus2-sdk-node          |
| STT           | Faster-Whisper (fedirz/faster-whisper-server) |
| LLM           | Ollama (llama3 + nomic-embed-text)            |
| TTS           | Piper (rhasspy/wyoming-piper)                 |
| Pipeline      | Pipecat                                       |
| Testing       | Vitest 1.6, Playwright                        |
| Container     | Docker Compose                                |

---

## Quick Start

### Prerequisites

- Docker ≥ 24 and Docker Compose ≥ 2.20
- 8 GB RAM minimum (16 GB recommended for Ollama)
- Ollama models downloaded (see below)

### 1. Clone & configure

```bash
git clone <repo-url>
cd s2s-rag
cp .env.example .env
# Edit .env – at minimum set JWT_SECRET
```

### 2. Pull Ollama models (first time only)

```bash
docker compose up -d ollama
docker compose exec ollama ollama pull llama3
docker compose exec ollama ollama pull nomic-embed-text
```

### 3. Start all services

```bash
docker compose up -d
```

Services start in order due to `depends_on` health checks:

1. PostgreSQL → 2. etcd + MinIO → 3. Milvus → 4. AI services → 5. Backend → 6. Frontend

### 4. Run database migrations

```bash
docker compose exec backend npx prisma@5 migrate deploy
```

### 5. Open the app

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | http://localhost:5173            |
| Backend API  | http://localhost:3000/api        |
| Swagger docs | http://localhost:3000/api/docs   |
| Health check | http://localhost:3000/api/health |

---

## Development

### Install dependencies

```bash
# Root (Yarn workspaces)
yarn install
```

### Backend

> **Hinweis zu Port-Konflikten:** Das Docker-Backend läuft auf Port 3000. Wenn du das Backend lokal startest während Docker läuft, gibt es einen Konflikt. Zwei Optionen:
>
> - Docker-Backend stoppen: `docker stop s2s-rag-backend`, dann normal `yarn start:backend:dev`
> - Lokalen Dev-Server auf Port 3001 starten: `yarn start:backend:dev:local` (und Frontend mit `yarn start:frontend:local` starten, damit der Vite-Proxy auf Port 3001 zeigt)

```bash
cd backend

# Run in watch mode
yarn dev

# Run unit tests
yarn test

# Run E2E tests
yarn test:e2e

# Generate Prisma client (only needed after schema.prisma changes)
npx prisma generate

# Create a new migration (only needed when changing schema.prisma;
# existing migrations are applied automatically on docker compose up)
npx prisma migrate dev
```

### Frontend

```bash
cd frontend

# Dev server (Vite HMR)
yarn dev

# Unit / component tests
yarn test

# Build
yarn build
```

### Linting & formatting

```bash
# From root
yarn lint
yarn format
```

---

## API Overview

Full OpenAPI spec at `specs/001-pdf-voice-rag/contracts/api.openapi.yaml` or at runtime via Swagger UI.

| Method | Path                         | Description           |
| ------ | ---------------------------- | --------------------- |
| POST   | /api/auth/register           | Create account        |
| POST   | /api/auth/login              | Get JWT               |
| POST   | /api/documents               | Upload PDF            |
| GET    | /api/documents               | List my documents     |
| POST   | /api/documents/ocr           | Upload photo for OCR  |
| POST   | /api/documents/:id/query     | Voice Q&A             |
| PATCH  | /api/documents/:id/exclude   | Exclude from search   |
| PATCH  | /api/documents/:id/re-enable | Re-enable in search   |
| GET    | /api/folders                 | List folders          |
| POST   | /api/folders                 | Create folder         |
| PATCH  | /api/folders/:id             | Rename folder         |
| DELETE | /api/folders/:id             | Delete folder         |
| POST   | /api/folders/:id/share       | Share folder by email |
| DELETE | /api/folders/:id/share       | Revoke share          |
| GET    | /api/recycle-bin             | List recycle bin      |
| POST   | /api/recycle-bin/:id/restore | Restore item          |
| DELETE | /api/recycle-bin/:id         | Permanently delete    |

All endpoints (except auth) require `Authorization: Bearer <token>`.

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable         | Default                    | Description                       |
| ---------------- | -------------------------- | --------------------------------- |
| `JWT_SECRET`     | –                          | **Required** – JWT signing secret |
| `DATABASE_URL`   | postgres://…               | PostgreSQL connection string      |
| `MILVUS_ADDRESS` | milvus:19530               | Milvus gRPC address               |
| `WHISPER_URL`    | http://faster-whisper:9000 | STT service URL                   |
| `OLLAMA_URL`     | http://ollama:11434        | LLM service URL                   |
| `PIPER_URL`      | http://piper:10200         | TTS service URL                   |
| `CORS_ORIGIN`    | http://localhost:5173      | Allowed frontend origin           |

---

## Testing

```bash
# All backend unit tests
cd backend && yarn test

# Frontend component tests
cd frontend && yarn test

# E2E (requires running stack)
cd frontend && yarn test:e2e
```

Coverage threshold is enforced at **≥80%** (branches, functions, lines, statements) via Vitest v8.

---

## Internationalisation

The frontend uses **i18next** with English (`en`) and German (`de`) translations located in:

```
frontend/src/i18n/locales/
  en.json
  de.json
```

Language preference is persisted in `localStorage` and synced to the user's profile via `PATCH /api/users/me/language`.

---

## License

MIT
