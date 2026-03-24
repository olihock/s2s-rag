# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Dummy Embedding & Empty Filename Bug
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope to concrete failing cases: any document upload uses dummyEmbedding instead of generateEmbedding; any chat query with results returns filename: ''
  - Test (a): indexDocument() is called → assert LlmService.generateEmbedding was called for each chunk (isBugCondition: usesRealEmbedding = false)
  - Test (b): chatQuery() with search results → assert sources[0].filename !== '' (isBugCondition: sourcesContainEmptyFilename = true)
  - The test assertions match Expected Behavior Properties from design (Requirements 2.1, 2.5)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unverändertes Verhalten für Nicht-Bug-Eingaben
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (isBugCondition = false)
  - Observe: chatQuery() with empty search results → sources: [] on unfixed code
  - Observe: generateEmbedding returning null-vector (Ollama down) → upload not aborted
  - Observe: chatQuery() with null from findUnique → no crash, fallback behavior
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for document interpretation bug (dummy embedding + empty filename)
  - [x] 3.1 Implement the fix
    - Inject LlmService into DocumentsService constructor
    - Replace this.dummyEmbedding(chunk) with await this.llmService.generateEmbedding(chunk) in indexDocument()
    - Remove dummyEmbedding() method (dead code after fix)
    - Inject PrismaService into ChatController constructor
    - After vectorService.search(), load filename for each documentId via prisma.document.findUnique()
    - Replace filename: '' with loaded filename (fallback to '' if document not found)
    - _Bug_Condition: isBugCondition(X) = (X is DocumentUpload AND usesRealEmbedding = false) OR (X is ChatQuery AND sourcesContainEmptyFilename = true)_
    - _Expected_Behavior: generateEmbedding called per chunk; source.filename = DB.document(documentId).filename_
    - _Preservation: DB storage, auth, empty sources, Ollama-fallback, documentId/chunkText/similarity unchanged_
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dummy Embedding & Empty Filename Bug
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.5_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Unverändertes Verhalten für Nicht-Bug-Eingaben
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
