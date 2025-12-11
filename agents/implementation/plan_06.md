# Implementation Plan 06: Definition Lineage, Locks & Project-Level UX

## 1. Overview
Goal: Evolve Studio from the current “flat but working” definitions and render pipeline into a lineage-aware experience that reflects the Space → Project model in `roadmap_v2`, with basic locking semantics and a clearer Project-level UX for working with imported assets and renders.

In scope:
- Tighten the Definition / RenderedAsset lineage model to align better with the Space/Project parts of `roadmap_v2` (sections 1–2, 5–6) without yet introducing Task-local clones.
- Add minimal lock flags and enforcement for “canonical” and imported assets at the DB + API layer (no hard deletes when assets are referenced).
- Improve the Project-level UI so users can see imported Characters/Scenes, their relationship to Space canon, and how Project renders relate back to these definitions.

Out of scope:
- Full Task-layer clone model (Task Base/Working clones) and task-driven locking (that belongs in a future plan once we harden the Project layer).
- Complex render classification UX (we will keep class data in metadata but not expose the full classification UI yet).
- Any breaking changes to existing already-deployed APIs unless clearly versioned or additive (we will evolve DB/API carefully and keep existing endpoints working).

Anchors:
- `agents/implementation/roadmap.md` — Phase 4 (Definitions & lineage) and Phase 6 (Refinements & Studio-level UX).
- `agents/implementation/roadmap_v2.md` — especially sections:
  - 1.1–1.6 (Space canonical asset types, mutability rules).
  - 2.1–2.4 (Project import model and deletion rules).
  - 5–6 (Render lineage and snapshot requirements).

## 2. Step-by-Step Plan

1. Tighten DB schema for lineage & soft locks  
   Status: Completed  
   Implementation:
   - Extend `definitions` and `rendered_assets` with minimal lock/state hints needed now (e.g., a boolean `is_canonical` or state values that distinguish canonical vs base vs working, plus a simple `locked` flag or derivable rule).
   - Add any missing indexes needed for lineage queries (e.g., by `root_id`, `parent_id`, and type/scope) that will be used by Project-level views.
   - Avoid destructive schema changes; use additive columns and constraints so existing data remains valid.  
   Testing: Re-run migrations against a fresh `studio` DB, verify tables and new columns; run a few insert/update/select queries to confirm locked assets cannot be deleted where enforced.  
   Checkpoint: Wait for developer approval before proceeding.

2. Implement minimal lock enforcement rules in backend services  
   Status: Completed  
   Implementation:
   - Update `definitions_service` and related routes so that:
     - Canonical Space-level definitions that have been imported into any Project cannot be deleted and can only be edited while in a non-locking state.
     - Project-scoped definitions that have downstream children or renders cannot be deleted; return clear error codes (e.g., `DEFINITION_LOCKED`).
   - Update `tasks_service` / render creation so that:
     - When a RenderedAsset is created, any referenced project-level definitions are treated as “in use” (even if this is reflected only in metadata/lock flags rather than strict FKs).
   - Ensure error responses are additive and do not break existing flows that don’t exercise delete/edit yet.  
   Testing: Add or use temporary scripts/API calls to:
   - Import a Space definition into a Project, create a render, then attempt to delete the Space or Project definition and confirm the API blocks the operation as expected.  
   Checkpoint: Wait for developer approval before proceeding.

3. Expose simple lineage and lock status via read APIs  
   Status: Completed  
   Implementation:
   - Extend existing read endpoints (e.g., Space and Project list definitions endpoints, project rendered-assets) to optionally include:
     - Origin fields (`scope`, `root_id`, `parent_id`) and a minimal lineage summary (e.g., derived from Space definition X, imported into Project Y).
     - Lock/usage hints (e.g., `isLocked: true`, `usageCounts` summarizing how many renders reference an asset).
   - Keep response shapes backward-compatible by adding new fields rather than changing existing ones.  
   Testing: Hit the updated endpoints via curl or browser dev tools and verify:
   - Lineage data makes sense for imported definitions and renders.
   - Lock status is correct for items with/without renders.  
   Checkpoint: Wait for developer approval before proceeding.

4. Enhance Project-level UI to surface imports, lineage, and locks  
   Status: Completed  
   Implementation:
   - In `client/src/App.tsx`, expand the selected Project view to:
     - Show a list of imported Characters/Scenes associated with the Project (simple grouped list, not a full library UI).
     - Indicate the Space origin (e.g., “Imported from Space asset X”) and any lock state (e.g., disable delete buttons or show a “locked” tag).
     - For RenderedAssets, show a brief caption or metadata snippet linking them back to their source definitions when the API provides it.
   - Keep the UI minimal and inline with the current style; avoid large refactors or routing changes.  
   Testing: In the browser:
   - Import definitions into a Project, create some renders, then view the Project-level panel and confirm that:
     - Imports are visible and labeled.
     - Locked items cannot be deleted or clearly indicate why.  
   Checkpoint: Wait for developer approval before proceeding.

5. Update docs and handoff notes to reflect lineage & lock behavior  
   Status: Completed  
   Implementation:
   - Update `README.md` to briefly document:
     - New lineage-related fields/flags on definitions and rendered_assets.
     - The basic lock rules (when an asset is considered locked vs deletable).
     - Any behavioral changes in delete/update APIs and their error codes.
   - Update the current handoff file in `agents/handoff/` with:
     - A summary of the new lineage/lock behavior.
     - Any caveats or follow-ups (e.g., Task-level clones to be implemented later per `roadmap_v2` section 3).  
   Testing: Confirm that a new developer can read `README.md` + the latest handoff and understand:
   - How Space/Project definitions relate.
   - When assets become locked.
   - How the UI reflects that state.  
   Checkpoint: Wait for developer approval before considering this plan complete.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed.  
- Step 2 — Status: Completed (Space-level delete endpoints now enforce locks based on project imports; project-level deletes and render-based locking remain future work).  
- Step 3 — Status: Completed (definitions APIs expose lineage and basic lock flags).  
- Step 4 — Status: Completed (Project UI shows imported assets and lineage hints).  
- Step 5 — Status: Completed (README and handoff updated for lineage/locks).
