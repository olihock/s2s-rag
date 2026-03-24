# Bugfix Requirements Document

## Introduction

`SttService.transcribe` crashes at runtime with `TypeError: form_data_1.default is not a constructor` when a POST request is made to `/api/documents/{id}/query`. The root cause is a CommonJS/ESM interop issue: `form-data` is a CommonJS module, and using a default import (`import FormData from 'form-data'`) causes the compiled output to reference `form_data_1.default`, which is `undefined` at runtime. This breaks the entire voice query flow for all users.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `SttService.transcribe` is called with a valid audio buffer and MIME type THEN the system throws `TypeError: form_data_1.default is not a constructor` because `FormData` is imported as a default import from the CommonJS `form-data` package, which does not expose a default export in the compiled output.

1.2 WHEN a POST request is made to `/api/documents/{id}/query` with a valid audio file THEN the system returns a 500 error and the voice query pipeline fails entirely.

### Expected Behavior (Correct)

2.1 WHEN `SttService.transcribe` is called with a valid audio buffer and MIME type THEN the system SHALL successfully construct a `FormData` instance, append the audio file and response format, and proceed to call the Whisper STT endpoint.

2.2 WHEN a POST request is made to `/api/documents/{id}/query` with a valid audio file THEN the system SHALL return a valid `VoiceQueryResult` containing the transcription, answer, and optional audio URL.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `SttService.transcribe` is called and the Whisper endpoint returns a successful response THEN the system SHALL CONTINUE TO return a `TranscriptionResult` with the correct `text` and `language` fields.

3.2 WHEN `SttService.transcribe` is called and the Whisper endpoint returns a non-OK response THEN the system SHALL CONTINUE TO throw a `ServiceUnavailableException`.

3.3 WHEN the `form` object is constructed THEN the system SHALL CONTINUE TO call `form.getHeaders()` to set the correct `Content-Type` multipart boundary headers on the fetch request.
