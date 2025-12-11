# Implementation Plan 11: Cast-Based Renders & Per-Render Prompts

## 1. Overview

Goal: Evolve Project task renders from a single “character + scene + style + prompt” selection into a richer **Cast** model:
- Multiple characters per render.
- At most one scene and at most one style.
- A per-render prompt that can change between renders of the same Task.

In scope:
- Backend support for:
  - Accepting multiple character definitions per render.
  - Clearly separating the “cast” (characters/scenes/styles) from the natural-language prompt.
  - Persisting per-render prompt + cast metadata in `rendered_assets.metadata`.
- Frontend support for:
  - A **Cast** section with pills (characters, scene, style) under each Task.
  - Removing items from the Cast via `×`.
  - A per-Task, per-render Prompt field used only when hitting Render.

Out of scope (for this plan):
- Task templates, saved “cast presets”, or shared casts across multiple tasks.
- Locking project-level definitions when they have been used in renders (we already discussed this as a future refinement).
- Any schema changes to `tasks` or `definitions`; we will rely on `rendered_assets.metadata` for per-render details.

Anchors:
- `server/src/tasks_routes.ts` — render endpoint, prompt composition, and metadata snapshots.
- `server/src/tasks_service.ts` — `rendered_assets` persistence.
- `client/src/App.tsx` & `client/src/views/ProjectView.tsx` — Project view, task list, and render controls.

## 2. Step-by-Step Plan

1. Introduce a Cast model in the frontend (UI and state only)  
   Status: Pending  
   Implementation:
   - In `ProjectView`, replace the current “Render character/scene/style (optional)” selects with a **Cast** section, per Task:
     - Characters: zero or more from `projectCharacters`.
     - Scene: zero or one from `projectScenes`.
     - Style: zero or one from `projectStyles`.
   - State in `App.tsx`:
     - Add per-task cast state, keyed by `taskId`, e.g.:
       - `castCharactersByTaskId: Record<number, number[]>`
       - `castSceneByTaskId: Record<number, number | null>`
       - `castStyleByTaskId: Record<number, number | null>`
   - UX:
     - Dropdowns above the task list (or inline with each Task) that:
       - Add a character to the cast (only if not already present).
       - Set/replace the scene for the cast.
       - Set/replace the style for the cast.
     - Under each Task, show “Cast” as pills:
       - `[Character Name] ×`, `[Scene Name] ×`, `[Style Name] ×`.
       - Clicking `×` updates cast state and removes the pill.  
   Testing:
   - Confirm that cast state updates correctly when adding/removing characters/scene/style.
   - For now, still send only a single character id to the backend (first in the array) to keep behavior unchanged until Step 2.  
   Checkpoint:
   - UI shows cast pills, and render continues to work as today using a simplified mapping (first character only).

2. Extend render endpoint to support multiple characters per render  
   Status: Pending  
   Implementation:
   - In `server/src/tasks_routes.ts`, update the render request body parsing to accept:
     - `characterDefinitionId?: number | null` (keep for backward compatibility).
     - `characterDefinitionIds?: number[]` (new).
   - Normalize into a single array:
     - If `characterDefinitionIds` is present and non-empty, use that.
     - Else if `characterDefinitionId` is present, treat it as an array of length 1.
   - Load all character definitions in one query:
     - `SELECT * FROM definitions WHERE id IN (?) AND ((scope='project' AND project_id=?) OR (scope='space' AND space_id=?)) AND type='character'`.
     - Validate all requested ids exist; if any missing, respond with an appropriate `CHARACTER_DEFINITION_NOT_FOUND` error.
   - Prompt composition:
     - Replace the single-character block with a loop over all characters:
       - For each, append a short “Character details” block derived from `character.metadata`.
   - Metadata:
     - In `rendered_assets.metadata`, store:
       - `characterDefinitionIds: number[]`
       - `characterMetadatas: CharacterAppearanceMetadata[]`  
   Testing:
   - Hit `POST /api/tasks/:taskId/render` with multiple character ids and confirm:
     - Render still succeeds.
     - Metadata contains all characters and their appearance JSON.
   Checkpoint:
   - Backend accepts and uses multiple characters per render; single-character callers still work unchanged.

3. Wire cast state into render calls from the Project UI  
   Status: Pending  
   Implementation:
   - In `App.tsx` / `ProjectView`:
     - Remove the current `selectedCharacterId`/`selectedSceneId`/`selectedStyleId` render-specific state in favor of per-task cast state.
     - When user clicks “Render” on a Task:
       - Look up `castCharactersByTaskId[taskId]`, `castSceneByTaskId[taskId]`, and `castStyleByTaskId[taskId]`.
       - Send:
         - `characterDefinitionIds: castCharactersByTaskId[taskId]` (array, possibly empty).
         - `sceneDefinitionId: castSceneByTaskId[taskId] ?? null`.
         - `styleDefinitionId: castStyleByTaskId[taskId] ?? null`.
   - Clear/upkeep:
     - When a project definition is deleted from the Project assets columns, ensure it is also removed from any cast state where it might be referenced.  
   Testing:
   - Add multiple characters to a task’s Cast, set a scene and style, then render:
     - Confirm the backend receives the correct ids and metadata.
   Checkpoint:
   - Cast pills fully drive what is rendered, no leftover usage of the old render selects.

4. Move Prompt from task creation to per-render UI  
   Status: Pending  
   Implementation:
   - Task creation:
     - Remove the Prompt textarea from the “Create task” form.
     - Keep `name` and `description` only for now (we can reuse `description` as a persistent summary of what the task is about).
   - Per-render prompt:
     - In `ProjectView`, add a Prompt textarea attached to each Task row (or a small “Show prompt” toggle that reveals it).
     - State:
       - `renderPromptByTaskId: Record<number, string>` in `App.tsx`.
   - Rendering:
     - On Render click for Task `id`, send `prompt: renderPromptByTaskId[id] ?? null` to the backend.
     - Leave the backend’s existing “prompt fallback” logic in place:
       - Use provided prompt (if non-empty), else `task.prompt` (still present for backward compat), else generic default.
   - Metadata:
     - We already store the final prompt in `rendered_assets.metadata.prompt`; keep this behavior.  
   Testing:
   - Create a Task without a prompt, set a prompt in the Task’s prompt field, render multiple times with different prompt values, and verify:
     - Each render includes its specific prompt in `rendered_assets.metadata.prompt`.
   Checkpoint:
   - Prompt is clearly per-render, with a simple per-task editing surface in the UI.

5. Clean up and document the new Cast & prompt behavior  
   Status: Pending  
   Implementation:
   - Code cleanup:
     - Remove now-unused render-selection state (`selectedCharacterId`, etc.) once cast state is fully in place.
   - Docs:
     - Update the latest handoff document to include:
       - Explanation of the Cast model (multi-character, single scene/style).
       - How per-render prompts work and where they are stored.
       - Example JSON snippet of `rendered_assets.metadata` showing cast and prompt.
   Testing:
   - Run `npm run build` in both `server` and `client`.
   - Manual click-through:
     - Create a task, assign cast, set a prompt, render.
     - Adjust cast and prompt and render again, ensuring no regressions in existing flows.  
   Checkpoint:
   - Cast-based rendering and per-render prompts are implemented and understood by future agents.

## 3. Progress Tracking Notes

- Step 1 — Status: Pending.  
- Step 2 — Status: Pending.  
- Step 3 — Status: Pending.  
- Step 4 — Status: Pending.  
- Step 5 — Status: Pending.  

Once Plan 11 is complete, Studio’s Project view will better match real-world workflows: tasks define “what we’re doing,” while each render can flexibly adjust the cast and prompt, making iteration on scenes and character groupings much smoother.  

