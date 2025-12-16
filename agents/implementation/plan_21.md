# Implementation Plan 21: Task-Level Aspect Ratio Control for Gemini Image Renders

## 1. Overview

Goal: Add a **task-scoped aspect ratio knob** that:
- Lets users choose a target aspect ratio per task (both space and project tasks).
- Persists that choice on the task record so it can be reused and changed over time.
- Feeds through to the actual Gemini request via `generationConfig.imageGenerationConfig.aspectRatio`.

Aspect ratio options (per your preference):
- `1:1`
- `3:4`
- `4:3`
- `9:16`
- `16:9`

Design choices:
- The knob lives on the **Task**, not on Character/Scene/Style.
- Each render can use the task’s current aspect ratio; you can change it between renders on the same task.
- When unset or set to “Auto / Not specified”, we **omit** the aspectRatio config and preserve current behavior.

Assumption: The `tasks` table now has a nullable `aspect_ratio` column:

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(16) NULL AFTER prompt;
```

Anchors:
- DB & services:
  - `db/migrations.sql`
  - `server/src/tasks_service.ts`
- API & routing:
  - `server/src/tasks_routes.ts`
  - `server/src/gemini_client.ts`
- Client (task UI):
  - `client/src/App.tsx` (task models and handlers)
  - Task sections in:
    - `SpaceView` (space-level tasks)
    - `ProjectView` (project-level tasks)

---

## 2. Backend: Persisting Aspect Ratio on Tasks

### Step 1 — Update Task types and services
**Status: Pending**

Implementation:
- In `server/src/tasks_service.ts`:
  - Extend `TaskRecord` (and `TaskWithProject` if needed) to include:

    ```ts
    aspect_ratio: string | null;
    ```

  - Ensure all `SELECT * FROM tasks` projections naturally include this column; no SQL change required if you’re already selecting `*`.
- Confirm `createTask` and `createSpaceTask`:
  - They already insert via:

    ```sql
    INSERT INTO tasks (project_id, space_id, name, description, prompt, status)
    ...
    ```

  - Because `aspect_ratio` is nullable with a default of `NULL`, no insert changes are required.

Testing:
- Manually create a task and verify via MySQL that `aspect_ratio` is `NULL` by default.

Checkpoint:
- Tasks can store an aspect ratio value, and type definitions know about it.

### Step 2 — Expose aspect ratio in task API payloads
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts`:
  - For `projectsRouter.get('/tasks')` and `spaceTasksRouter.get('/tasks')`:
    - The returned task JSON should include `aspectRatio` derived from `task.aspect_ratio`:

      ```ts
      return {
        ...task,
        aspectRatio: task.aspect_ratio,
      };
      ```

  - For task creation routes (`POST /projects/:id/tasks` and `POST /spaces/:id/tasks`):
    - Optionally accept an `aspectRatio?: string | null` field in the request body.
    - For this plan, we can keep creation simple (default to `null`) and handle updates in a separate handler.

### Step 3 — Add a minimal aspect ratio update endpoint
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts` (likely under `taskRenderRouter` scope or a new tasks router), add:

  ```ts
  taskRenderRouter.patch(
    '/',
    async (req: AuthedRequest, res: Response): Promise<void> => {
      const task = await loadOwnedTaskOr404(req, res);
      if (!task) return;

      const { aspectRatio } = req.body as { aspectRatio?: string | null };

      const allowed = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
      const normalized =
        aspectRatio && allowed.has(aspectRatio) ? aspectRatio : null;

      const db = getDbPool();
      await db.query('UPDATE tasks SET aspect_ratio = ? WHERE id = ?', [
        normalized,
        task.id,
      ]);

      res.status(200).json({ aspectRatio: normalized });
    },
  );
  ```

Notes:
- This keeps aspect ratio validation local and simple.
- We reuse `loadOwnedTaskOr404` so only the owner can change it.

Testing:
- Hit `PATCH /api/tasks/:taskId` with `{ "aspectRatio": "16:9" }` and ensure DB updates.

Checkpoint:
- Tasks can persist an aspect ratio via a dedicated API call.

---

## 3. Backend: Wiring Aspect Ratio into Gemini Requests

### Step 4 — Extend Gemini client options
**Status: Pending**

Implementation:
- In `server/src/gemini_client.ts`:
  - Extend `GeminiRenderOptions`:

    ```ts
    export type GeminiRenderOptions = {
      prompt: string;
      inlineImages?: GeminiInlineImage[];
      inlineImageTexts?: string[];
      aspectRatio?: string | null;
    };
    ```

  - When normalizing `arg` in `renderImageWithGemini`, carry `aspectRatio` through:

    ```ts
    const options: GeminiRenderOptions =
      typeof arg === 'string'
        ? { prompt: arg }
        : {
            prompt: arg.prompt,
            inlineImages: arg.inlineImages ?? [],
            inlineImageTexts: arg.inlineImageTexts ?? [],
            aspectRatio: arg.aspectRatio ?? null,
          };
    ```

  - When calling the Gemini model:
    - For text-only:

      ```ts
      if (!inlineImages || inlineImages.length === 0) {
        return model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: aspectRatio
            ? { imageGenerationConfig: { aspectRatio } }
            : undefined,
        });
      }
      ```

    - For text + images:
      - Build `contents` with `parts` as we do now.
      - Call:

      ```ts
      return client.models.generateContent({
        model: cfg.model,
        contents: [{ role: 'user', parts }],
        config: aspectRatio
          ? { imageConfig: { aspectRatio /* + imageSize */ } }
          : undefined,
      });
      ```

Notes:
- We only set `config.imageConfig.aspectRatio` (and a compatible `imageSize`) when the value is a known string (see Step 5 and Plan 22).
- DEBUG logging (`DEBUG_PROMPT=1`) should log the chosen `aspectRatio` and it will also appear under `config.imageConfig` in the stub JSON.

### Step 5 — Map task aspect ratio into GeminiRenderOptions
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts`, inside `taskRenderRouter.post('/render')`:
  - When preparing to call `renderImageWithGemini`, determine the effective aspect ratio:

    ```ts
    const allowedAspectRatios = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
    const taskAspectRatio =
      task.aspect_ratio && allowedAspectRatios.has(task.aspect_ratio)
        ? task.aspect_ratio
        : null;
    ```

  - Adjust the final call:

    ```ts
    const image = await renderImageWithGemini(
      inlineImages.length > 0
        ? {
            prompt: finalPrompt,
            inlineImages,
            inlineImageTexts,
            aspectRatio: taskAspectRatio,
          }
        : { prompt: finalPrompt, aspectRatio: taskAspectRatio },
    );
    ```

Notes:
- If we later want per-render overrides (e.g., UI sends an aspectRatio directly in the render POST body), we can let that override the stored `task.aspect_ratio`.

Testing:
- With DEBUG_PROMPT on:
  - Confirm a render with aspect ratio set to `16:9` logs that choice.
  - Verify the JSON stub includes the `generationConfig` block with `imageGenerationConfig.aspectRatio`.

Checkpoint:
- Every render now respects the task’s aspect ratio knob when present.

---

## 4. Frontend: Task UI and Aspect Ratio Selector

### Step 6 — Extend client task models
**Status: Pending**

Implementation:
- In `client/src/App.tsx`:
  - Extend `TaskSummary` type to include:

    ```ts
    aspectRatio?: string | null;
    ```

  - When parsing tasks from `/api/projects/:id/tasks` and `/api/spaces/:id/tasks`, pass through `aspectRatio` from the response.

Checkpoint:
- Tasks in client state know their aspect ratio, if set.

### Step 7 — Add aspect ratio selector to task cards
**Status: Pending**

Implementation:
- In the task UI for:
  - Project tasks (Project view).
  - Space tasks (Space tasks section).
- For each task row:
  - Add a small select next to the existing controls (e.g., near the character/scene/style selectors and prompt box):

    ```tsx
    <label style={{ fontSize: '0.8rem' }}>
      Aspect ratio:
      <select
        value={task.aspectRatio ?? ''}
        onChange={(e) => handleTaskAspectRatioChange(task.id, e.target.value)}
      >
        <option value="">Auto</option>
        <option value="1:1">1:1</option>
        <option value="3:4">3:4</option>
        <option value="4:3">4:3</option>
        <option value="9:16">9:16</option>
        <option value="16:9">16:9</option>
      </select>
    </label>
    ```

- In `App.tsx`, implement `handleTaskAspectRatioChange`:
  - Update local `tasks` state immediately (optimistic UI).
  - Fire `PATCH /api/tasks/:taskId` with `{ aspectRatio }`.
  - On failure, optionally revert and show a small error message.

Notes:
- Using `''` as “Auto” keeps the field optional.
- The server will validate and normalize; client just passes the raw string.

Checkpoint:
- Users can see and change aspect ratio on each task, and those changes persist.

---

## 5. Prompt & Logging Polish (Optional)

### Step 8 — Reflect aspect ratio in the prompt (lightweight)
**Status: Pending**

Implementation:
- In `server/src/prompt_renderer.ts`:
  - Optionally add a short note under `SCENE` or `STYLE` when `taskAspectRatio` is set, e.g. under a small “Output framing” block:

    ```text
    Output Framing:
    - Target aspect ratio: 16:9 (widescreen).
    ```

Notes:
- This is not required for the model to respect aspectRatio (the `generationConfig` is the primary mechanism), but it can help make the request more self-describing when you review debug prompts.

### Step 9 — Logging aspect ratio in DEBUG mode
**Status: Pending**

Implementation:
- In `tasks_routes.ts` render handler or `gemini_client.ts`:
  - When `isPromptDebugEnabled()` is true and an aspect ratio is set, log a one-line summary:

    ```ts
    console.log(
      `[ai] Gemini render aspectRatio for task ${task.id}: ${taskAspectRatio}`,
    );
    ```

Checkpoint:
- It’s easy to see from logs which aspect ratio was requested for any render.

---

## 6. Acceptance Criteria

- Each task (space or project) has an **Aspect ratio** select with options:
  - Auto (no aspectRatio sent), `1:1`, `3:4`, `4:3`, `9:16`, `16:9`.
- Selected aspect ratio is persisted in the `tasks.aspect_ratio` column.
- When rendering a task:
  - The Gemini request includes `generationConfig.imageGenerationConfig.aspectRatio` set to that value, when one is chosen.
  - When no aspect ratio is chosen, no `imageGenerationConfig.aspectRatio` is sent, preserving existing behavior.
- Multiple renders from the same task can use different aspect ratios by changing the knob between renders.
- With `DEBUG_PROMPT=1`, logs show:
  - The chosen aspect ratio for each render (if any).
  - A JSON stub where `generationConfig.imageGenerationConfig.aspectRatio` matches the task setting.
