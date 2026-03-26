<!--
  SYNC IMPACT REPORT
  ===================
  Version Change: 2.2.0 → 2.3.0
  Amendment Date: 2026-03-26
  Amendment Type: MINOR (Mandatory PDF library: pdfjs-dist)

  Changes:
  - Added pdfjs-dist (PDF.js) as the required PDF text extraction library in Backend stack
  - pdf-parse MUST NOT be used for PDF text extraction
  - pdfjs-dist handles complex font encoding and is already in use in the codebase

  Rationale:
  - pdfjs-dist (Mozilla PDF.js) correctly handles complex font encodings and Type3 fonts
    that pdf-parse fails on, preventing silent data loss during text extraction
  - pdfjs-dist is the production-ready, actively maintained successor for Node.js PDF parsing
  - The codebase already uses pdfjs-dist; this aligns the constitution with actual practice

  Modified Principles: None
  Added: pdfjs-dist entry in Technology Stack Requirements → Backend
  Removed: None (pdf-parse was not previously mandated in the constitution)

  Templates Status:
  ✅ plan-template.md - No changes required
  ✅ spec-template.md - No changes required
  ✅ tasks-template.md - No changes required

  Follow-up TODOs:
  - Remove any residual pdf-parse dependency from package.json/yarn.lock if still present
-->

<!--
  SYNC IMPACT REPORT
  ===================
  Version Change: 1.0.1 → 2.0.0
  Amendment Date: 2026-03-12
  Amendment Type: MAJOR (Breaking data layer change)

  Changes:
  - Milvus vector database is primary for vector search; PostgreSQL is permitted for relational data
  - Zilliz SDK for Milvus access; Prisma ORM for PostgreSQL (if used)
  - Updated Container-Based Deployment principle (V) for Milvus/PostgreSQL
  - Updated Technology Stack Requirements for vector-first architecture, relational data, and Tailwind CSS for UI

  Rationale:
  - Milvus is purpose-built for vector similarity search (core RAG requirement)
  - PostgreSQL is a proven, robust relational database for metadata, user management, and transactional data
  - Milvus: superior performance for embedding/vector operations vs PostgreSQL + pgvector
  - Native support for HNSW, IVF_FLAT, and other vector indexing algorithms (Milvus)
  - Zilliz SDK provides official TypeScript support with strong type safety
  - Prisma ORM provides type-safe access to PostgreSQL
  - Tailwind CSS enables rapid, consistent, and modern UI development with utility-first design
  - Better horizontal scaling for vector workloads (Milvus)
  - Optimized for retrieval-augmented generation use cases

  Breaking Changes:
  - Milvus is required for vector search; PostgreSQL is permitted for relational data
  - Data modeling: use collections/vectors for embeddings, tables/relations for metadata
  - Milvus uses query DSL via Zilliz SDK; PostgreSQL uses SQL via Prisma ORM

  Templates Status:
  ✅ plan-template.md - No changes required (principles remain compatible)
  ✅ spec-template.md - No changes required
  ✅ tasks-template.md - No changes required

  Follow-up TODOs:
  - Document vector schema design patterns for S2S-RAG use cases
  - Define embedding dimension standards (e.g., 768 for sentence-transformers)
  - Establish collection partitioning strategy for multi-tenant scenarios
  - Document PostgreSQL schema patterns for metadata and transactional data
-->

# S2S-RAG Constitution

Speech-to-Speech RAG (Retrieval Augmented Generation) system with local AI processing.

## Core Principles

### I. API-First Architecture

**Description**: Backend and frontend MUST be decoupled through well-defined REST APIs.

- All backend functionality MUST be exposed via RESTful endpoints using NestJS framework
- API contracts MUST be defined before implementation (OpenAPI/Swagger documentation required)
- Frontend (React/Vite) MUST communicate with backend exclusively through documented APIs
- No direct database access from frontend components
- API versioning MUST follow semantic versioning (v1, v2, etc.)

**Rationale**: Enables independent development of frontend and backend, facilitates testing, allows for future mobile/desktop clients, and ensures clear separation of concerns in a distributed architecture.

### II. Type Safety Throughout

**Description**: TypeScript MUST be used for all code - backend, frontend, and shared interfaces.

- All code MUST be written in TypeScript with strict mode enabled
- Any usage MUST be explicitly documented and justified
- Shared types MUST be defined in a common package/module accessible to both frontend and backend
- API request/response types MUST match between backend DTOs and frontend interfaces
- Type assertions MUST be avoided; use type guards instead

**Rationale**: Prevents runtime errors, improves IDE support, enables refactoring confidence, and ensures type consistency across the full stack.

### III. Test-Driven Development (NON-NEGOTIABLE)

**Description**: All features MUST follow test-first development using Vitest.

- Tests MUST be written before implementation
- Tests MUST fail initially, then pass after implementation (Red-Green-Refactor)
- Unit tests MUST achieve ≥80% code coverage for business logic
- Integration tests MUST verify API contracts and inter-service communication
- All AI component integrations MUST have integration tests verifying proper audio/text flow

**Rationale**: Ensures correctness, prevents regressions, documents behavior, and enables safe refactoring in a complex AI-powered system.

### IV. Local-First AI Components

**Description**: All AI processing MUST run locally without external API dependencies.

- **STT (Speech-to-Text)**: MUST use Faster-Whisper for audio transcription
- **LLM Engine**: MUST use Ollama with Llama 3 for language processing
- **TTS (Text-to-Speech)**: MUST use Piper or Kokoro for audio synthesis
- **Audio Stream Control**: MUST use Pipecat for professional audio stream management
- External AI APIs (OpenAI, Google, etc.) MUST NOT be used in production
- AI model configurations MUST be environment-configurable for different deployment scenarios

**Rationale**: Ensures data privacy, eliminates external API costs, removes network dependencies, enables offline operation, and provides predictable latency.

### V. Container-Based Deployment

**Description**: All services MUST be containerized and orchestrated via Docker Compose.

- Every service (backend, frontend, vector database, AI models) MUST have a Dockerfile
- Docker Compose MUST define the complete development and production environments
- Milvus vector database MUST run in a container with persistent volumes for vector storage
- Environment variables MUST be used for configuration (no hardcoded values)
- AI model containers MUST include model files or download them on first run
- Health checks MUST be defined for all services

**Rationale**: Ensures reproducible environments, simplifies deployment, enables horizontal scaling, and reduces "works on my machine" issues.

### VI. Real-Time Audio Processing

**Description**: Audio pipeline MUST minimize latency and handle streaming gracefully.

- Audio input MUST be processed in real-time using streaming protocols
- STT MUST begin transcription before audio input completes (streaming mode)
- TTS MUST begin output synthesis as soon as first LLM tokens are available
- Pipecat MUST manage audio buffers to prevent dropouts and maintain synchronization
- Latency targets: End-to-end response SHOULD complete within 2 seconds for short queries
- Error handling MUST gracefully degrade (e.g., timeout to text mode if audio fails)

**Rationale**: Provides natural conversational experience, maintains user engagement, and prevents frustration from long delays in speech-to-speech interactions.

## Technology Stack Requirements

This section codifies the mandatory technology choices for the S2S-RAG project.

### Backend

- **Language**: TypeScript (ES2022+)
- **Framework**: NestJS (with dependency injection, decorators, and modular architecture)
- **Runtime**: Node.js 20+ LTS
- **Vector Database**: Milvus 2.3+ with Zilliz SDK (@zilliz/milvus2-sdk-node)
- **Relational Database**: PostgreSQL 15+ (optional, for metadata/transactions) with Prisma ORM
- **API Documentation**: Swagger/OpenAPI 3.0
- **PDF Text Extraction**: pdfjs-dist (PDF.js) — MUST be used for all PDF content parsing;
  pdf-parse MUST NOT be used
- **Validation**: class-validator and class-transformer

### Frontend

- **Language**: TypeScript (ES2022+)
- **Framework**: React 18+
- **Build Tool**: Vite 5+
- **State Management**: React Context API or Zustand (avoid Redux unless justified)
- **HTTP Client**: Axios or native Fetch API
- **UI Components**: Tailwind CSS (mandatory for all UI design)

### Testing

- **Test Framework**: Vitest (for both unit and integration tests)
- **Coverage Requirement**: ≥80% for services, models, and API endpoints
- **E2E Testing**: Playwright (optional, for critical user journeys)
- **Mocking**: Vitest built-in mocks for dependencies

### AI Components

- **STT**: Faster-Whisper (Python-based, exposed via API or gRPC)
- **LLM**: Ollama with Llama 3 model (API compatible with OpenAI format)
- **TTS**: Piper or Kokoro (Python-based, exposed via API)
- **Stream Control**: Pipecat framework for audio pipeline orchestration

### Infrastructure

- **Containerization**: Docker 24+ with multi-stage builds
- **Orchestration**: Docker Compose (for local dev and production)
- **Vector Database**: Milvus 2.3+ container (milvusdb/milvus) with persistent volume mounts for vector data and metadata
- **Relational Database**: PostgreSQL 15+ container (postgres) with persistent volume for data
- **Environment Management**: .env files with dotenv library (never commit secrets)

### Code Quality

- **Linting**: ESLint with TypeScript-specific rules
- **Formatting**: Prettier with consistent configuration
- **Pre-commit Hooks**: Husky + lint-staged for automated checks
- **Version Control**: Git with conventional commits (feat:, fix:, docs:, etc.)

## Development Workflow

### Code Review Requirements

- All code MUST be peer-reviewed before merging to main
- PRs MUST pass all automated tests (unit, integration, linting)
- PRs MUST include updated tests for new functionality
- PRs MUST reference the relevant spec or task from `.specify/`
- Breaking changes MUST increment major version and document migration path

### Quality Gates

- **Pre-merge**: All tests pass, coverage ≥80%, no linting errors, no TypeScript errors
- **Pre-deployment**: Integration tests pass, Docker Compose health checks pass, manual smoke test complete
- **Post-deployment**: Monitor logs for errors, verify latency metrics, confirm AI components responsive

### Branch Strategy

- **main**: Production-ready code only
- **feature branches**: Named per SpecKit convention `###-feature-name`
- Branches MUST be short-lived (≤5 days before merge or archive)

### Documentation Requirements

- Every feature MUST have a spec in `specs/###-feature/`
- API endpoints MUST be documented in Swagger/OpenAPI
- README MUST contain setup instructions, architecture diagram, and quickstart
- Complex AI integrations MUST have dedicated documentation in `docs/ai-components/`

## Governance

### Constitution Authority

- This constitution supersedes all other project practices and conventions
- All feature development, code reviews, and architectural decisions MUST comply with these principles
- Violations MUST be documented and justified in the Complexity Tracking section of plan.md

### Amendment Procedure

- Constitution changes MUST be proposed via the `/speckit.constitution` command
- Amendments MUST include:
  - Rationale for the change
  - Impact analysis on existing code and templates
  - Migration plan if breaking existing patterns
  - Updated version number following semantic versioning
- Major changes (new/removed principles) MUST be reviewed by project leads

### Compliance Review

- Constitution compliance MUST be checked during:
  - Feature planning phase (Constitution Check in plan.md)
  - Code review (reviewers verify adherence to principles)
  - Retrospectives (identify patterns that violate principles)
- Repeated violations indicate need for constitution amendment or additional guidance

### Version Policy

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principle additions or material expansions of guidance
- **PATCH**: Clarifications, wording improvements, typo fixes

<!--
  SYNC IMPACT REPORT
  ===================
  Version Change: 2.0.0 → 2.1.0
  Amendment Date: 2026-03-12
  Amendment Type: MINOR (New backend option: PostgreSQL)

  Changes:
  - PostgreSQL 15+ (with Prisma ORM) is now permitted for relational/transactional data
  - Milvus remains required for vector search
  - Updated rationale, stack, and infra sections

  Templates Status:
  ✅ plan-template.md - No changes required
  ✅ spec-template.md - No changes required
  ✅ tasks-template.md - No changes required

  Follow-up TODOs:
  - Document PostgreSQL schema patterns for metadata/transactions
-->

**Version**: 2.1.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-12

<!--
  SYNC IMPACT REPORT
  ===================
  Version Change: 2.1.0 → 2.2.0
  Amendment Date: 2026-03-12
  Amendment Type: MINOR (Mandatory UI: Tailwind CSS)

  Changes:
  - Tailwind CSS is now required for all frontend UI design
  - Updated rationale and stack sections

  Templates Status:
  ✅ plan-template.md - No changes required
  ✅ spec-template.md - No changes required
  ✅ tasks-template.md - No changes required

  Follow-up TODOs:
  - Ensure all UI code and examples use Tailwind CSS
-->

**Version**: 2.3.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-26
