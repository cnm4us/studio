# Implementation Plan 24: Capture Detailed Gemini Errors for Debugging

## 1. Overview

Goal: When `DEBUG_PROMPT` is enabled, capture and persist as much structured error information as possible from `@google/genai` image-generation calls, without changing user-visible API behavior. This is strictly for server-side debugging and observability; clients should continue to see the same error shapes and statuses they do today.

In scope:
- Enhancing error handling around `renderImageWithGemini` so that failures from `@google/genai` are:
  - Captured as structured error objects.
  - Logged with useful detail.
  - Optionally written to timestamped debug files alongside the existing Gemini request stubs.
- Ensuring this debug behavior is gated behind `DEBUG_PROMPT` so that verbose error logging is opt-in and safe for production.

Out of scope:
- Any changes to client-visible error shapes or HTTP status codes.
- Any new UI error handling or messaging.
- Changing retry behavior or introducing new resilience patterns (circuit breakers, backoff, etc.).

Anchors:
- Gemini client, request construction, and debug request stubs:
  - `server/src/gemini_client.ts`
  - `server/debug/gemini-request-*.json`
- Task render flow and current error mapping:
  - `server/src/tasks_routes.ts`
- Gemini SDK and error types:
  - `server/node_modules/@google/genai/dist/genai.d.ts`

---

## 2. Goals and Error Taxonomy (Server-Side Only)

### Step 1 — Clarify error categories we care about
Status: Planned  

Implementation:
- Inspect the `@google/genai` SDK types and docs to confirm how errors are surfaced:
  - `ApiError` and related types from `genai.d.ts` (e.g., `status`, `message`).
  - Any additional properties on the underlying error payload (e.g., error codes, reasons).
- Define a lightweight internal taxonomy for logging (not exposed to clients), for example:
  - Configuration issues (missing API key, bad model name).
  - Networking/transport errors (connection failures, timeouts).
  - Quota and rate limiting.
  - Content-safety and policy blocks.
  - Invalid requests (shape/fields the API rejects).
  - Internal API errors (5xx from the Gemini service).

Testing:
- No code-level testing yet; this step is about documentation and confirming what fields are available from the SDK.

Checkpoint:
- We have a short list of error categories and fields we want to log for each, guiding the implementation in later steps.

---

## 3. Structured Error Capture in `renderImageWithGemini`

### Step 2 — Wrap `models.generateContent` and normalize errors
Status: Planned  

Implementation:
- In `server/src/gemini_client.ts`, around the existing `client.models.generateContent(...)` call:
  - Introduce a `try/catch` that specifically detects SDK errors, e.g.:
    - `ApiError` from `@google/genai`.
    - Any other Gemini-specific error types if present.
  - In the `catch`, build a structured internal error object, for example:

    ```ts
    type GeminiDebugError = {
      source: 'genai';
      upstreamStatus?: number;
      upstreamMessage?: string;
      upstreamBody?: unknown;
      category?: string; // from our taxonomy
      timestamp: string;
    };
    ```

- Do not change the thrown error type or message that bubbles up to callers:
  - Preserve existing sentinel errors (`GEMINI_NOT_CONFIGURED`, `GEMINI_NO_IMAGE_RETURNED`).
  - For SDK/API failures, continue to throw the same shape we throw today so that `tasks_routes` behavior stays unchanged.
  - The new `GeminiDebugError` object is for logging/debugging only, not for client responses.

Testing:
- Add unit tests in `server/src/gemini_client.test.ts` (or similar) that:
  - Simulate an `ApiError` and verify that:
    - The underlying thrown error is unchanged relative to current behavior.
    - The normalization helper returns a structured `GeminiDebugError` object with expected fields.

Checkpoint:
- `renderImageWithGemini` can produce a rich internal error description for any Gemini failure, without altering its public API or error semantics.

---

## 4. Debug Logging and Error Stub Files under `DEBUG_PROMPT`

### Step 3 — Log structured Gemini errors when `DEBUG_PROMPT` is enabled
Status: Planned  

Implementation:
- Reuse the existing `isPromptDebugEnabled()` helper in `server/src/gemini_client.ts` as the single gate for verbose logging.
- In the `catch` block for `models.generateContent`, when `isPromptDebugEnabled()` is `true`:
  - Log a concise console line summarizing the error, e.g.:

    ```ts
    console.error(
      '[ai] Gemini error (model=..., status=..., category=...):',
      geminiDebugError,
    );
    ```

  - Ensure logs never include secrets or API keys; focus on:
    - HTTP status.
    - High-level error code/category from the API.
    - Condensed error message.

- Keep console logging disabled (beyond today’s behavior) when `DEBUG_PROMPT` is not set, to avoid noisy logs in normal operation.

Testing:
- With `DEBUG_PROMPT=1` and a mocked failing Gemini call:
  - Verify that a structured console error is emitted once per failure.
- With `DEBUG_PROMPT` unset or `0`:
  - Verify that only the existing minimal logs (if any) are emitted.

Checkpoint:
- When `DEBUG_PROMPT` is on, operators can see high-signal structured logs for Gemini failures without any change to API responses.

---

### Step 4 — Persist Gemini error stubs alongside request stubs
Status: Planned  

Implementation:
- In `server/src/gemini_client.ts`, in the same area where we write `gemini-request-*.json` files:
  - When a Gemini call fails and `isPromptDebugEnabled()` is `true`, write a corresponding error stub file under `server/debug`, e.g.:
    - `gemini-error-<timestamp>.json`
  - Include, at minimum:
    - `model`
    - `request` (either:
      - A reference/path to the request stub file for this call, or
      - A minimal inline copy of the request envelope to make the error file self-contained)
    - `error`: the structured `GeminiDebugError` object.
  - Optionally include any safe subset of the upstream error body that helps debugging (e.g., top-level `code`, `reason`, `status`), while avoiding large blobs and sensitive content.
- Reuse the existing debug directory creation logic and timestamp formatting used for request stubs to keep file naming consistent.

Testing:
- With `DEBUG_PROMPT=1` and a forced error scenario:
  - Confirm that both:
    - A `gemini-request-*.json` file is written for the attempted call.
    - A `gemini-error-*.json` file is written with the expected fields.
  - Manually inspect the error file to ensure:
    - It’s small, readable, and contains the necessary context to debug the failure.
    - No secrets or raw API keys are present.

Checkpoint:
- Each failing Gemini call under `DEBUG_PROMPT` produces a pair of debug artifacts (request + error) suitable for deep server-side debugging.

---

## 5. Keep API Surface and Task Error Handling Stable

### Step 5 — Ensure `tasks_routes` behavior is unchanged
Status: Planned  

Implementation:
- Review the `try/catch` around `renderImageWithGemini` in `server/src/tasks_routes.ts`:
  - Confirm that:
    - Existing sentinel errors (`GEMINI_NOT_CONFIGURED`, `GEMINI_NO_IMAGE_RETURNED`, `S3_NOT_CONFIGURED`) are still mapped exactly as they are today.
    - All other errors from `renderImageWithGemini` still produce the same `TASK_RENDER_FAILED` response.
- If any new internal error types are introduced to support debugging, ensure they are wrapped or translated in such a way that:
  - The outward-facing error response remains unchanged.
  - The new debugging information remains server-only (logs + debug files).

Testing:
- Run existing tests that exercise the render task endpoint (or add focused tests if missing):
  - Confirm that HTTP statuses and response bodies are identical before and after this change.
- Optionally snapshot a small set of responses from a staging environment before and after to confirm stability.

Checkpoint:
- The introduction of detailed Gemini error logging has zero impact on clients; all changes are strictly additive for server-side debugging.

---

## 6. Documentation and Operational Notes

### Step 6 — Document debugging workflow and safeguards
Status: Planned  

Implementation:
- Update `agents/README.md` or a relevant debugging-focused doc to describe:
  - How to enable Gemini debug mode:
    - `DEBUG_PROMPT=1` (or any truthy value) on the server.
  - Where to find artifacts:
    - `server/debug/gemini-request-*.json` for outbound requests.
    - `server/debug/gemini-error-*.json` for corresponding failures.
  - How to correlate request and error files (e.g., matching timestamps or explicit linking fields).
- Call out safeguards:
  - No API keys or sensitive tokens are ever written to disk.
  - Debug mode is intended for controlled environments (development, staging, or tightly controlled production debugging windows).

Testing:
- Manual validation only:
  - Follow the documented steps on a dev environment and ensure the described files and logs appear as expected.

Checkpoint:
- Operators and developers have a clear, documented workflow for using `DEBUG_PROMPT` to investigate Gemini failures end-to-end.

