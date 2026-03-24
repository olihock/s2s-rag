# form-data-constructor-bug Bugfix Design

## Overview

`SttService.transcribe` crashes with `TypeError: form_data_1.default is not a constructor` because `form-data` is a CommonJS module. Using a default import (`import FormData from 'form-data'`) causes TypeScript to compile it to `form_data_1.default`, which is `undefined` at runtime since the package only exposes a module-level export, not a `.default` property.

The fix is a one-line change: replace the default import with a namespace import (`import * as FormData from 'form-data'`), which compiles to `form_data_1 = require('form-data')` and correctly resolves to the constructor.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `FormData` is imported via default import, causing `form_data_1.default` to be `undefined` at runtime
- **Property (P)**: The desired behavior — `new FormData()` constructs successfully and the transcription request proceeds
- **Preservation**: Existing behavior that must remain unchanged — error handling, header generation via `form.getHeaders()`, and the `TranscriptionResult` shape
- **SttService.transcribe**: The method in `backend/src/services/stt.service.ts` that builds a multipart form and calls the Whisper STT endpoint
- **form_data_1.default**: The compiled output of `import FormData from 'form-data'` under `esModuleInterop` — resolves to `undefined` for CJS-only packages that lack a `.default` export
- **namespace import**: `import * as FormData from 'form-data'` — compiles to `const form_data_1 = require('form-data')`, correctly binding the constructor

## Bug Details

### Bug Condition

The bug manifests when `SttService.transcribe` is called. The `new FormData()` call throws because the default import resolves to `undefined` under the TypeScript/CommonJS compilation target.

**Formal Specification:**

```
FUNCTION isBugCondition(module)
  INPUT: module — the resolved value of the `form-data` import
  OUTPUT: boolean

  RETURN module.default === undefined
         AND typeof module === 'function'   // the constructor IS the module itself
END FUNCTION
```

### Examples

- `import FormData from 'form-data'` → compiled: `form_data_1.default` → `undefined` → `new FormData()` throws `TypeError: form_data_1.default is not a constructor`
- `import * as FormData from 'form-data'` → compiled: `form_data_1 = require('form-data')` → the constructor itself → `new FormData()` succeeds
- Any call to `POST /api/documents/{id}/query` with audio → 500 error because `transcribe` always throws before reaching `fetch`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- When the Whisper endpoint returns a successful response, `transcribe` SHALL return a `TranscriptionResult` with correct `text` and `language` fields
- When the Whisper endpoint returns a non-OK response, `transcribe` SHALL throw `ServiceUnavailableException`
- `form.getHeaders()` SHALL continue to be called to set the correct `Content-Type` multipart boundary on the fetch request

**Scope:**
All behavior that does NOT involve constructing `FormData` is unaffected. This includes:

- The fetch call and its options structure
- Error handling and logging
- The `TranscriptionResult` return shape
- The `whisperUrl` configuration logic

## Hypothesized Root Cause

1. **Default import on a CJS-only package**: `form-data` does not set `module.exports.default`. With `esModuleInterop: true`, TypeScript wraps the require call but only synthesizes `.default` for modules that set `__esModule = true`. Since `form-data` does not, `.default` is `undefined`.

2. **tsconfig target**: The backend compiles to CommonJS (`"module": "commonjs"` in `tsconfig.json`). Under this target, `import X from 'y'` becomes `X = require('y').default` (or the interop helper equivalent), which fails for CJS packages without a `.default` export.

3. **No runtime guard**: There is no `instanceof` check or fallback before `new FormData()`, so the `TypeError` is thrown immediately and propagates as a 500.

## Correctness Properties

Property 1: Bug Condition - FormData Constructor Resolves

_For any_ call to `SttService.transcribe` with a valid audio buffer and MIME type, the fixed import SHALL cause `new FormData()` to successfully construct a `FormData` instance (not throw `TypeError`), allowing the method to append fields and call `fetch`.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Existing Transcription Behavior Unchanged

_For any_ input where the bug condition does NOT hold (i.e., `FormData` construction succeeds), the fixed `transcribe` method SHALL produce the same observable behavior as the original — returning a `TranscriptionResult` on success and throwing `ServiceUnavailableException` on a non-OK response — preserving all downstream logic.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `backend/src/services/stt.service.ts`

**Specific Changes**:

1. **Replace default import with namespace import**:
   - Before: `import FormData from 'form-data';`
   - After: `import * as FormData from 'form-data';`

No other changes are needed. The rest of the file (`new FormData()`, `form.append(...)`, `form.getHeaders()`) is correct and works as-is once the import resolves to the constructor.

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on the unfixed code to confirm the `TypeError` is thrown, then verify the fix resolves it while preserving all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface the `TypeError: form_data_1.default is not a constructor` on unfixed code to confirm the root cause.

**Test Plan**: Call `SttService.transcribe` with a mocked `fetch` and assert that it throws with the expected `TypeError` message. Run on the UNFIXED code to observe the failure.

**Test Cases**:

1. **Constructor throws on unfixed code**: Call `transcribe(Buffer.from('audio'), 'audio/wav')` and assert it throws `TypeError: ... is not a constructor` (will fail/pass unexpectedly on fixed code)
2. **No fetch call made**: Assert `fetch` is never called when the constructor throws (confirms the crash happens before the network call)

**Expected Counterexamples**:

- `new FormData()` throws `TypeError` before `fetch` is ever called
- Root cause: `form_data_1.default` is `undefined` due to CJS/ESM interop

### Fix Checking

**Goal**: Verify that after the fix, `transcribe` successfully constructs `FormData` and completes the request.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(resolvedImport) DO
  result := transcribe_fixed(input.buffer, input.mimeType)
  ASSERT expectedBehavior(result)  // no TypeError, fetch was called, result has text+language
END FOR
```

### Preservation Checking

**Goal**: Verify that the fix does not change any behavior beyond resolving the constructor crash.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(resolvedImport) DO
  ASSERT transcribe_original(input) = transcribe_fixed(input)
END FOR
```

**Testing Approach**: Unit tests covering the two preserved behaviors (success path and error path) are sufficient here since the fix is a single import statement with no logic changes.

**Test Cases**:

1. **Success path preservation**: Mock `fetch` to return `{ ok: true, json: () => ({ text: 'Hello', language: 'en' }) }` → assert result matches `{ text: 'Hello', language: 'en' }`
2. **Error path preservation**: Mock `fetch` to return `{ ok: false, status: 500 }` → assert `ServiceUnavailableException` is thrown
3. **Headers preservation**: Assert `form.getHeaders()` result is passed as `headers` in the `fetch` call

### Unit Tests

- Test that `new FormData()` does not throw after the import fix
- Test success path returns correct `TranscriptionResult`
- Test non-OK response throws `ServiceUnavailableException`
- Test that `fetch` is called with multipart headers from `form.getHeaders()`

### Property-Based Tests

- Generate random valid `(Buffer, mimeType)` pairs and assert `transcribe` never throws `TypeError` (only network errors)
- Generate random non-OK status codes and assert `ServiceUnavailableException` is always thrown

### Integration Tests

- POST to `/api/documents/{id}/query` with a real audio buffer and assert a valid `VoiceQueryResult` is returned (requires Whisper endpoint mock or stub)
