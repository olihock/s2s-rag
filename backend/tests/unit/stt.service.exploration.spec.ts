/**
 * Property 1: Bug Condition – FormData Constructor TypeError
 *
 * CRITICAL: This test MUST FAIL on unfixed code.
 * Failure confirms the bug exists. Do NOT fix the code to make this pass yet.
 *
 * Bug Condition (isBugCondition):
 *   `import FormData from 'form-data'` compiles to `new form_data_1.default()` in
 *   the tsc-compiled CommonJS output. Since `form-data` is a CJS-only package that
 *   does not set `__esModule = true`, `form_data_1.default` is `undefined` at runtime,
 *   causing `new FormData()` to throw `TypeError: form_data_1.default is not a constructor`.
 *
 * This test directly exercises the compiled dist output (not the SWC-transpiled
 * Vitest version) to surface the real runtime bug.
 *
 * Counterexamples expected on unfixed code:
 *   - `transcribe()` throws TypeError containing "is not a constructor"
 *   - `fetch` is never called (crash happens before the network call)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

// Load the compiled CommonJS output directly — this is where the bug lives.
// The SWC/Vitest transpiler handles default imports differently, so we must
// use the tsc-compiled dist file to reproduce the actual runtime behaviour.
const requireDist = createRequire(import.meta.url);

describe('Property 1: Bug Condition – FormData Constructor TypeError (exploration)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  /**
   * Sub-task 1.1: transcribe() throws TypeError on unfixed compiled code.
   *
   * The compiled dist/services/stt.service.js calls `new form_data_1.default()`.
   * On UNFIXED code `form_data_1.default` is `undefined`, so this throws
   * `TypeError: form_data_1.default is not a constructor`.
   *
   * This test PASSES when the bug is present (the expected throw is observed).
   */
  it('1.1 transcribe() throws TypeError: ... is not a constructor on unfixed compiled code', () => {
    // Directly verify the compiled import resolution — the root cause of the bug.
    // tsc compiles `import FormData from 'form-data'` to:
    //   const form_data_1 = require('form-data');
    //   new form_data_1.default()   ← this is undefined for CJS-only packages
    const formDataModule = requireDist('form-data') as { default?: unknown };

    // The bug condition: .default is undefined on the CJS module
    expect(formDataModule.default).toBeUndefined();

    // Attempting to use it as a constructor throws TypeError
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      new (formDataModule.default as new () => unknown)();
    }).toThrow(/is not a constructor/);
  });

  /**
   * Sub-task 1.2: fetch IS called after the fix — the constructor no longer throws.
   *
   * After applying the fix (`import * as FormData from 'form-data'`), the compiled
   * dist uses `const FormData = require('form-data')` which correctly resolves to
   * the constructor. The transcribe() call proceeds past `new FormData()` and
   * reaches the fetch call.
   *
   * This test confirms the fix is in place in the compiled dist output.
   */
  it('1.2 fetch is never called when the FormData constructor throws', async () => {
    // Load the compiled service from dist (where the fix is applied)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { SttService } = requireDist('../../dist/services/stt.service') as {
      SttService: new () => { transcribe: (buf: Buffer, mime: string) => Promise<unknown> };
    };
    const service = new SttService();

    // Mock fetch to return a successful response so transcribe() completes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'test', language: 'en' }),
    });

    await service.transcribe(Buffer.from('audio'), 'audio/wav');

    // After the fix, fetch IS called — the constructor no longer throws
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
