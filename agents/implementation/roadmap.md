# Studio Implementation Roadmap

This roadmap connects the high-level architecture in `agents/architecture/` to concrete implementation plans in `agents/implementation/plan_nn.md`. Each phase is small enough to execute with one or a handful of plans, and each plan remains focused and testable.

Treat this document as the TOC; detailed steps live in the individual `plan_nn.md` files.

---

## Phase 1 – Bootstrap & Infrastructure

**Goal:** Stand up a clean Studio app skeleton with its own DB, backend, frontend, and Nginx/site configuration.

- Anchors:
  - High-level API/DB ideas: `agents/architecture/04_API_DB.md` §1.
- Plans:
  - `plan_01.md` – Studio App Bootstrap (DB, Node Stack, Nginx)  
    - Status: Completed  
    - Result: `studio` DB + `schema_version` migration, minimal Express/TS backend (`/health`, `/health/db`, `/api/spaces`), Vite/React frontend shell, Nginx config for `studio.bawebtech.com`, and root README.

---

## Phase 2 – Spaces & Auth Skeleton

**Goal:** Introduce the core tenant boundary (Spaces) and a minimal auth model so everything else can be scoped cleanly.

- Anchors:
  - Asset lifecycle spec: `agents/architecture/01_format_asset_lifecycle_specification.md` §1–3 (Spaces as creative universes).
  - API/DB: `agents/architecture/04_API_DB.md` §2.1 (Space endpoints), §3 (spaces).
- Scope (high-level):
  - Add `spaces` table and basic CRUD (name, description, owner).
  - Implement `/api/spaces` REST endpoints on the new server.
  - Add a minimal auth/session model (can be simple email/password; fine to evolve later).
  - Update the frontend dashboard to list Spaces and allow creating a Space.
- Plans:
  - `plan_02.md` – Spaces & Minimal Auth Skeleton  
    - Status: Completed (see `agents/handoff/handoff_02.md`)

---

## Phase 3 – Projects & Import Flow (Space → Project)

**Goal:** Introduce Projects under Spaces and the initial UX for importing/cloning assets from Space into Project, matching the “Project Asset Library” flow.

- Anchors:
  - Asset lifecycle spec: `01_format_asset_lifecycle_specification.md` §3 (Space/Project scopes), §5.2–5.3.
  - Inheritance model: `02_asset_inheritance_model.md` §1–4.
  - UI/UX flow: `03_UIUX_Flow.md` §1–3.
  - API/DB: `04_API_DB.md` §2.5–2.6, §3 (projects).
- Scope (high-level):
  - Add `projects` table, tied to `spaces`.
  - Add basic Project CRUD and a Project landing view.
  - Decide on the initial representation for CharacterDefinitions and SceneDefinitions (per-type tables vs. a shared `definitions` table).
  - Implement a simple “Import Characters/Scenes from Space into Project” flow using `parent_id` + `root_id` lineage.
- Plans:
  - `plan_03.md` – Projects & basic import from Spaces  
    - Status: Completed (see `agents/handoff/handoff_02.md` and `handoff_03.md`)

---

## Phase 4 – Definitions, Lineage & Lifecycle States

**Goal:** Move toward the unified Definition model and lineage-aware behavior across Spaces and Projects, with lifecycle states (`draft`, `canonical`, `deprecated`, `archived`).

- Anchors:
  - Asset lifecycle spec: `01_format_asset_lifecycle_specification.md` §2, §4–6.
  - Inheritance model: `02_asset_inheritance_model.md` §1–7.
  - API/DB: `04_API_DB.md` §2.2–2.4, §3 (definitions table).
- Scope (high-level):
  - Introduce `root_id`, `parent_id`, and `state` fields on definitions (or introduce a shared `definitions` table and migrate toward it).
  - Wire lineage and states for Characters/Scenes/Styles in both Space and Project scopes.
  - Ensure Space assets are immutable once canonical, and that Project clones never mutate Space assets directly.
  - Add simple UI indicators for lineage and state.
- Plans:
  - `plan_04.md` – Definitions, lineage fields, and lifecycle states  
    - Status: Implemented in v1 form (unified `definitions` table with `root_id`/`parent_id`, simple `isCanonical`/`isLocked` flags; advanced lifecycle states still TODO, see `roadmap_v2.md`)

---

## Phase 5 – RenderedAssets & Tasks

**Goal:** Model Tasks and RenderedAssets so image generation can be fully lineage-aware and project-scoped.

- Anchors:
  - Asset lifecycle spec: `01_format_asset_lifecycle_specification.md` §2.4, §3.3, §5.5.
  - Inheritance model: `02_asset_inheritance_model.md` §4–7.
  - UI/UX flow: `03_UIUX_Flow.md` §4–7.
  - API/DB: `04_API_DB.md` §2.7, §3 (rendered_assets, tasks).
- Scope (high-level):
  - Introduce `tasks` and `rendered_assets` tables (or adapt a minimal version based on the Graphics app’s `images` table).
  - Implement `POST /projects/{projectId}/tasks` and `POST /tasks/{taskId}/render` endpoints that call the image model and persist RenderedAssets with lineage metadata.
  - Build a simple UI for viewing Task history and RenderedAssets per Project.
- Plans:
  - `plan_05.md` – Tasks, rendered assets, and basic render pipeline  
    - Status: Completed (DB tables, render endpoint, S3/Gemini integration, project-level gallery)
  - `plan_11.md` – Cast-based renders & per-render prompts  
    - Status: Completed (per-task cast UI, multi-character support, per-render prompts and metadata)
  - `plan_12.md` – Rendered asset modal & state controls  
    - Status: Completed (modal viewer, draft/approve/delete states, approved-only global gallery)

---

## Phase 6 – Refinements, Overrides & Studio-Level UX

**Goal:** Add polish and advanced behaviors: style overrides, richer import variants, “Smart Import Assistant”, and better lineage visualization.

- Anchors:
  - UI/UX flow: `03_UIUX_Flow.md` (variants, warnings, Smart Import Assistant).
  - Asset lifecycle & inheritance docs as above.
- Scope (high-level):
  - StyleOverride model for project-specific tweaks on top of Space-level styles.
  - Richer variant creation flows (expression, wardrobe, lighting) on top of the base inheritance model.
  - Lineage tree views for characters/scenes/styles across projects.
  - Safety UX: warnings on risky operations (deleting parents, editing canon, etc.).
- Plans:
  - `plan_06.md`, `plan_07.md`, … – to be created as specific refinement features are prioritized.

---

## Usage Notes

- At the start of a new thread:
  - Read the latest `agents/handoff/handoff_nn.md`.
  - Read this roadmap.
  - Open the relevant `plan_nn.md` for the active phase.
- When creating a new implementation plan:
  - Reference the relevant architecture sections explicitly in the plan’s Overview.
  - Keep scope tight so each plan can be executed and completed without leaking into the next phase.

---

## Status Snapshot & Where to Continue

- Phases 1–3: Completed and stable (bootstrap, auth, spaces, projects, basic imports).
- Phase 4: Partially implemented:
  - Unified `definitions` table, lineage fields, and basic `isCanonical` / `isLocked` behavior are in place.
  - Full lifecycle states and clone hierarchies should follow `roadmap_v2.md` (asset pipeline spec).
- Phase 5: Vertical slice implemented:
  - Tasks + rendered_assets + S3/Gemini, per-task cast model, per-task and global (approved-only) galleries, and rendered asset state transitions via modal.
- Next phases / next thread:
  - Use `agents/implementation/roadmap_v2.md` plus `handoff_04.md` to drive:
    - Task-level clones, project/space clone semantics, and full locking rules.
    - “Promote render to Asset” flows and canonical render handling.
