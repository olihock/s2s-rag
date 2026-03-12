# Phase 0 Research: PDF Voice RAG Feature

## Unknowns and Research Tasks

### Extracted Unknowns (NEEDS CLARIFICATION)
- None (all major requirements and clarifications resolved in spec)

### Technology/Integration Best Practices
- Milvus vector schema design for RAG (multi-tenant, per-user isolation)
- Zilliz SDK usage patterns in TypeScript/NestJS
- Real-time audio streaming with Pipecat and NestJS
- Efficient OCR integration (Faster-Whisper, photo upload pipeline)
- Secure folder/document sharing (access control, email validation)
- Multi-language (EN/DE) support for STT, TTS, and LLM
- Docker Compose orchestration for all services (Milvus, AI, backend, frontend)
- Test-driven development with Vitest for API, AI, and integration

## Research Tasks

1. Research Milvus vector schema design for multi-tenant, per-user document isolation in RAG.
2. Find best practices for Zilliz SDK usage in TypeScript/NestJS for document indexing and search.
3. Research real-time audio streaming integration with Pipecat and NestJS backend.
4. Find best practices for integrating Faster-Whisper OCR/photo pipeline in a TypeScript/Node.js stack.
5. Research secure folder/document sharing patterns (access control, email validation, revocation).
6. Find best practices for multi-language (EN/DE) support in STT, TTS, and LLM (Ollama, Piper/Kokoro).
7. Research Docker Compose orchestration for Milvus, AI models, backend, and frontend.
8. Find best practices for TDD with Vitest for API, AI, and integration tests in this stack.

## Next Steps
- Consolidate findings and decisions in this file as research proceeds.
- Document rationale and alternatives for each major technical decision.
