# Tasks: form-data-constructor-bug

## Task List

- [x] 1. Write exploratory tests (unfixed code)
  - [x] 1.1 Add a test in `backend/tests/unit/stt.service.exploration.spec.ts` that calls `SttService.transcribe` and asserts it throws `TypeError: ... is not a constructor`, confirming the bug on unfixed code
  - [x] 1.2 Assert that `fetch` is never called when the constructor throws

- [x] 2. Apply the fix
  - [x] 2.1 In `backend/src/services/stt.service.ts`, replace `import FormData from 'form-data'` with `import * as FormData from 'form-data'`

- [x] 3. Write fix-checking tests
  - [x] 3.1 Add a test in `backend/tests/unit/stt.service.fix.spec.ts` that mocks `fetch` to return a successful response and asserts `transcribe` returns a valid `TranscriptionResult` without throwing

- [x] 4. Write preservation tests
  - [x] 4.1 Add a test verifying the success path still returns `{ text, language }` correctly (Property 2 — Validates Requirements 3.1)
  - [x] 4.2 Add a test verifying a non-OK fetch response still throws `ServiceUnavailableException` (Property 2 — Validates Requirements 3.2)
  - [x] 4.3 Add a test verifying `form.getHeaders()` is passed as `headers` in the `fetch` call (Property 2 — Validates Requirements 3.3)

- [x] 5. Run all tests and confirm passing
  - [x] 5.1 Run `cd backend && npx vitest --run` and confirm all stt-related tests pass
