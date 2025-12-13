# Implementation Plan 20_2: Reference Constraint Definitions & Prompt Integration (Text Side)

## 1. Overview

Goal: Introduce **Reference Constraints** as a first-class definition type in Studio, parallel to Characters, Scenes, and Styles. A Reference Constraint describes *how strictly* the model should follow reference images (identity, layout, pose, camera, style application), independent of any specific character/scene/style. In this plan we:
- Add a new shared config (`referenceConstraints/`) describing these fields.
- Add `reference_constraint` as a definition type in the DB and server/client metadata.
- Provide full Space-level workflows:
  - Create, edit, clone, delete Reference Constraints.
  - Import them into Projects like other definitions.
- Let tasks (Space + Project) attach **one Reference Constraint** per render.
- Extend the Prompt Renderer to emit a `REFERENCE CONSTRAINTS` section based on the selected constraint’s metadata.

This plan focuses on the **text side**: the model still only sees the constraints as instructions in the prompt, while Plan 20_1 handles inline images. Later plans will refine how strongly the model adheres to these constraints.

Out of scope (later 20_x plans):
- Image-side behavior tuning (how constraints interact with inline image parts).
- Multi-constraint blending (using more than one Reference Constraint at once).
- UI affordances for switching “modes” (e.g., explicit “Photo → Illustration” mode toggle).

Anchors:
- Shared config + metadata:
  - `shared/definition_config/*`
  - `server/src/definition_metadata.ts`
  - `client/src/definitionMetadata.ts`
- Definitions infra:
  - `db/migrations.sql` — `definitions` table
  - `server/src/definitions_service.ts`
  - `server/src/space_definitions_routes.ts`
  - `server/src/project_definitions_routes.ts`
  - `server/src/project_import_routes.ts`
- Client:
  - `client/src/App.tsx`
  - `client/src/views/SpaceView.tsx`
  - `client/src/views/ProjectView.tsx`
  - `client/src/views/*DefinitionFormView.tsx`
  - `client/src/views/SpaceTasksView.tsx`
- Prompt engine:
  - `server/src/prompt_renderer.ts`
  - `agents/prompt_rendering/README.md`

---

## 2. Step-by-Step Plan

### Step 1 — Add shared Reference Constraint config and metadata types
**Status: Pending**

Implementation:
- In `shared/definition_config`, add `referenceConstraints/`:
  - `types.ts` similar to style types:

    ```ts
    export type ReferenceConstraintPropertyType = 'string' | 'enum' | 'tags';

    export type ReferenceConstraintOption = { value: string; label: string };

    export type ReferenceConstraintProperty = {
      key: string;
      label: string;
      type: ReferenceConstraintPropertyType;
      description?: string;
      options?: ReferenceConstraintOption[];
      allowCustom?: boolean;
    };

    export type ReferenceConstraintCategory = {
      key: string;
      label: string;
      order: number;
      description?: string;
      properties: ReferenceConstraintProperty[];
    };

    export type ReferenceConstraintConfig = {
      categories: ReferenceConstraintCategory[];
    };
    ```

  - `coreConstraints.ts` (or `referenceConstraintsCategory.ts`) implementing the user’s proposed fields:
    - `fidelity_mode`, `identity_lock`, `layout_lock`, `camera_flexibility`, `pose_flexibility`, `style_application` (tags).
  - `index.ts` exporting `referenceConstraintConfig` with a categories array (starting with the single `reference_constraints` category, but structured to allow additional categories later).
- Client metadata:
  - In `client/src/definitionMetadata.ts` add:

    ```ts
    export type ReferenceConstraintMetadata = {
      reference_constraints?: {
        fidelity_mode?: string;
        identity_lock?: string;
        layout_lock?: string;
        camera_flexibility?: string;
        pose_flexibility?: string;
        style_application?: string[];
        [key: string]: string | string[] | undefined;
      };
      [categoryKey: string]:
        | {
            [propertyKey: string]: string | string[] | undefined;
          }
        | undefined;
    };
    ```

  - Mirror this on the server in `server/src/definition_metadata.ts`.

Testing:
- Type-check shared configs in both client/server builds.

Checkpoint:
- Reference Constraints have a shared config and a metadata shape ready to flow through definitions and the prompt renderer.

---

### Step 2 — Extend `definitions` to support `reference_constraint` type
**Status: Pending**

Implementation:
- In `db/migrations.sql`:
  - Add an ALTER statement to extend the enum:

    ```sql
    ALTER TABLE definitions
      MODIFY COLUMN type ENUM('character', 'scene', 'style', 'reference_constraint') NOT NULL;
    ```

  - This works for both new and existing DBs (existing rows remain valid).
- In `server/src/definitions_service.ts`:
  - Extend any union types / guards that refer to definition types to include `'reference_constraint'`.
  - Ensure `createSpaceDefinition` and `listSpaceDefinitions` treat the type generically so they work for Reference Constraints with minimal special-casing.
- In `server/src/space_definitions_routes.ts`:
  - Add handlers parallel to characters/scenes/styles:
    - `GET /reference-constraints` → list space definitions of type `'reference_constraint'`.
    - `GET /reference-constraints/:definitionId` → fetch a single space-scoped constraint.
    - `POST /reference-constraints` → create.
    - `PATCH /reference-constraints/:definitionId` → edit (respect locking like other definitions).
    - `DELETE /reference-constraints/:definitionId` → delete (respect locking semantics).
- In `server/src/project_definitions_routes.ts` and `server/src/project_import_routes.ts`:
  - Support listing, importing, and deleting project-scoped Reference Constraints:
    - Treat them analogously to Styles:
      - Imported from space scope into project scope definitions.

Testing:
- Manual API calls for:
  - `GET/POST/PATCH/DELETE /api/spaces/:spaceId/reference-constraints`
  - `GET /api/projects/:projectId/definitions/reference-constraints`
  - `POST /api/projects/:projectId/import` with a `referenceConstraints` payload (if we choose to support import in this plan).

Checkpoint:
- Reference Constraints are stored in `definitions` with a dedicated `type`, and we can manage them via Space and Project APIs.

---

### Step 3 — Client: Space/Project UI for Reference Constraints
**Status: Pending**

Implementation:
- In `client/src/App.tsx`:
  - Extend `DefinitionSummary.type` union to include `'reference_constraint'`.
  - Extend space definitions loading (`loadDefinitions`) to also fetch `reference-constraints` (or reuse the existing per-type endpoints if we add them).
  - Extend project definitions loading (`loadProjectDefinitions`) likewise.
  - Routing:
    - Add route kinds:

      ```ts
      | { kind: 'spaceNewReferenceConstraint'; spaceId: number }
      | { kind: 'spaceEditReferenceConstraint'; spaceId: number; definitionId: number }
      ```

    - Parse hash routes like `#/spaces/:spaceId/reference-constraints/new` and `#/spaces/:spaceId/reference-constraints/:id/edit`.
    - Add corresponding `navigateTo` variants.
- Space view:
  - In `client/src/views/SpaceView.tsx`:
    - Add a new column/list for “Reference Constraints”, similar to Characters/Scenes/Styles:
      - Show name, state (`Draft` vs `Canonical · Locked`), description.
      - Actions: Clone, Edit (if not locked), Delete (if not locked).
    - Add a “Create reference constraint” button next to Create Character/Scene/Style, wired to the new `spaceNewReferenceConstraint` route.
- Reference Constraint form:
  - Add `client/src/views/ReferenceConstraintDefinitionFormView.tsx`:
    - Similar structure to `StyleDefinitionFormView`:
      - Name, description fields.
      - A config-driven rendering of `referenceConstraintConfig.categories` and their properties.
    - Props mirror the other form views:
      - `mode`, `spaceName`, `selectedSpaceId`, `createDefinitionLoading`, `newConstraintName`, `newConstraintDescription`, `constraintMetadata`, setters, `onSubmit`, `onCancel`.
  - Wire this form into `App.tsx` for the `spaceNewReferenceConstraint` and `spaceEditReferenceConstraint` routes, using the same create/edit semantics as characters/scenes/styles.

Testing:
- From a Space:
  - Create a Reference Constraint, edit it, clone it, delete it.
  - Verify lock semantics once imported into a project (see next step).

Checkpoint:
- Reference Constraints are first-class citizens in the Space and Project UIs, with the same ergonomics as other definitions.

---

### Step 4 — Project import & locking semantics
**Status: Pending**

Implementation:
- In `server/src/project_import_routes.ts`:
  - Extend the import payload type to optionally include:

    ```ts
    referenceConstraints?: number[];
    ```

  - Implement import logic mirroring characters/scenes/styles:
    - For each space-scoped reference constraint id:
      - Validate that it belongs to the source space for the project.
      - Create a project-scoped definition row with:
        - `type = 'reference_constraint'`
        - `scope = 'project'`
        - `project_id = target project`
        - `root_id` / `parent_id` semantics consistent with existing import logic.
- Locking:
  - Ensure `isSpaceDefinitionLockedForDelete` (or equivalent logic) treats space-scoped Reference Constraints as “locked” once imported into one or more projects, just like other canonical definitions.
- Client:
  - Extend `ProjectView` to:
    - List project-level Reference Constraints in a similar way to Styles (optional in this plan if we want to keep UI minimal, but strongly recommended).
    - Show which project tasks are using which Reference Constraint (future enhancement; not required here).

Testing:
- Import a space Reference Constraint into a project:
  - Confirm it appears in the project definitions list.
  - Confirm the original space definition is shown as `Canonical · Locked` in the Space view and cannot be edited/deleted.

Checkpoint:
- Reference Constraints follow the same space→project import and locking semantics as other canonical definitions.

---

### Step 5 — Task UI: attach a Reference Constraint to a render
**Status: Pending**

Implementation:
- Server / API:
  - In `server/src/tasks_routes.ts` render endpoint, extend the input payload to accept:

    ```ts
    referenceConstraintDefinitionId?: number | null;
    ```

  - When present:
    - Load the referenced definition, similar to style/scene:
      - Ensure:
        - For project tasks: `scope='project' AND project_id=...` **or** `scope='space' AND space_id=...` if we allow direct space references.
        - For space tasks: `scope='space' AND space_id=...`.
      - Parse its `metadata` into `ReferenceConstraintMetadata`.
    - Pass this metadata into the prompt renderer (see next step).
- Client:
  - In `client/src/views/SpaceTasksView.tsx` and `client/src/views/ProjectView.tsx`:
    - Add a “Reference constraint” select alongside Style/Scene:
      - Options:
        - None.
        - List of available Reference Constraints (space-scoped for space tasks; project-scoped for project tasks).
    - When constructing the render request, include the selected `referenceConstraintDefinitionId` in the payload.

Testing:
- Create a task:
  - Attach characters + style with no Reference Constraint → behavior unchanged.
  - Attach only a Reference Constraint + Style + optional prompt → confirm the server accepts the payload and render succeeds.

Checkpoint:
- Tasks can opt into a single Reference Constraint per render, with appropriate auth/ownership checks on the server.

---

### Step 6 — Prompt Renderer: add REFERENCE CONSTRAINTS section
**Status: Pending**

Implementation:
- In `server/src/prompt_renderer.ts`:
  - Extend `RenderPromptOptions` to include:

    ```ts
    referenceConstraint?: ReferenceConstraintMetadata | null;
    referenceConstraintName?: string | null;
    ```

  - Add a helper:

    ```ts
    const renderReferenceConstraintsSection = (
      name: string | null | undefined,
      meta: ReferenceConstraintMetadata | null | undefined,
    ): string | '' => { /* config-driven rendering */ };
    ```

    - Use `referenceConstraintConfig.categories` and properties to:
      - Emit a header `REFERENCE CONSTRAINTS`.
      - Emit bullets for each defined property:

        ```text
        REFERENCE CONSTRAINTS
        - Name: Jennifer Face Fidelity (optional)
        - Reference fidelity mode: High Fidelity (Minimal Interpretation)
        - Character identity lock: Strict Identity Preservation
        - Scene layout lock: Preserve Layout & Proportions
        - Camera adjustment allowance: Minor angle/framing adjustments
        - Character pose flexibility: Adapt pose to task
        - Style application scope: Rendering Technique Only, Color Interpretation
        ```

      - Use option labels (via config) for human-readable output; fall back to key humanization for custom values.
  - Call this helper from `renderPrompt`:
    - Order: after `IMAGE REFERENCES` and before `STYLE` is a good default:

      ```text
      IMAGE REFERENCES
      ...

      REFERENCE CONSTRAINTS
      ...

      STYLE
      ...
      ```

- Server render path:
  - In `tasks_routes.ts`, when we load the Reference Constraint definition, pass its metadata and name into `renderPrompt`.

Testing:
- Render a task with:
  - Reference Constraint + Style + Characters/Scene.
  - Confirm the prompt includes a clear `REFERENCE CONSTRAINTS` section.
  - Confirm that adding/removing values in the Reference Constraint definition config automatically shows up in the section after rebuild.

Checkpoint:
- The textual prompt expresses Reference Constraints in a dedicated, config-driven section, matching the pattern of other sections (Style, Scene, Characters).

---

## 3. Progress Tracking

- Step 1 — Shared Reference Constraint config + metadata types: Pending  
- Step 2 — Extend `definitions` to support `reference_constraint`: Pending  
- Step 3 — Client: Space/Project UI for Reference Constraints: Pending  
- Step 4 — Project import & locking semantics: Pending  
- Step 5 — Task UI: attach a Reference Constraint to a render: Pending  
- Step 6 — Prompt Renderer: add REFERENCE CONSTRAINTS section: Pending  

Once Plan 20_2 is complete, Reference Constraints will be first-class definitions that can be created, cloned, locked, and imported, attached to tasks, and rendered as a dedicated section in the prompt, shaping how the model interprets any attached reference images and styles. 

