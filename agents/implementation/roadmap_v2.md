ASSET PIPELINE SPEC v4
Spaces → Projects → Tasks → Renders (Unified System)

(Fully normalized, immutable/mutable lifecycle, lineage-safe, snapshot-driven)

-------------------------------------------
1. Spaces (Canonical Layer)
-------------------------------------------

The Space is the top-level environment where users create and manage Canonical Assets (the permanent truths of their universe).

1.1 Canonical Asset Types

Character Definitions

Scene Definitions

Style Definitions

1.2 Neutrality Flags

Style Definitions may be flagged neutral

Scene Definitions may be flagged neutral

Neutral assets enable the distinction between Character vs Scene renders.

1.3 Render Classification Rules (App-Enforced)

Every render generated in Space or Projects or Tasks is classified automatically:

Character Render

Character Definition + Neutral Style

Character Definition + Non-neutral Style

Character Definition + Neutral Scene
(Anything with exactly one Character Definition and no Scene Definition)

Scene Render

Scene Definition only (one or many)

Compilation Render

Character + Scene

Multiple Character Definitions

Multiple Scene Definitions

No definitions at all

These rules are deterministic and cannot be overridden by the user.

1.4 Generating Renders in Space

Users may generate renders using any combination of canonical definitions.

Each Space render stores:

Render type

Snapshot of definition(s)/style(s) used

Unique render ID

1.5 Importability to Projects

Projects may import from a Space:

Character Definitions (canonical)

Scene Definitions (canonical)

Style Definitions (canonical)

Character Renders (canonical)

Scene Renders (canonical)

Compilation Renders (reference-only)

1.6 Canonical Asset Mutability Rules

A canonical asset (definition or render) becomes locked (immutable) when:

A Project imports it or

A canonical render exists that references it

A canonical asset becomes mutable again only if:

No Projects have imported its base clone

No Project-level cloned definitions reference it

No Space renders reference it

No Project renders (tasks or otherwise) reference it

This ensures zero orphaning or mismatch between versions.

-------------------------------------------
2. Projects (Derived Layer)
-------------------------------------------

A Project is an isolated workspace where creators refine canonical assets into project-ready forms.

2.1 Import Model (Definitions + Renders)

When a Project imports a canonical asset:

Creates:

Immutable Base Clone

Mirrors canonical exactly

Cannot be edited

Cannot be deleted unless all downstream references are gone

Allows Creation Of:

Project Working Clones (mutable child definitions)

Editable

Deletable unless used in any render or Task

Represent “versions” of the asset for the Project's purposes

Project Working Clones derive from the Base Clone, not from the canonical directly.

2.2 Render Imports

When a canonical render is imported:

Create Immutable Base Render Clone

It becomes a Project-level render (immutable)

Project tasks may create Task render clones from it (see Tasks)

2.3 Project Render Generation

When generating renders inside Projects (not Tasks):

Renders are stored as Project Renders

Classified under the standard rules

Store snapshots of all definitions and renders used

A Project Render locks:

Any Project definitions used

Any canonical definitions upstream

Any working clones downstream

until all dependent renders are deleted.

2.4 Project Asset Deletion Rules

A Project asset (definition or render) can be deleted only if:

It has no dependent renders

It has no dependent Task-level clones

It is not a Base Clone that still has active working clones

-------------------------------------------
3. Tasks (Local Production Layer)
-------------------------------------------

A Task is a self-contained generation session within a Project —
like “Generate Page 4”, “Produce Character Expressions”, or “Nighttime Variant for This Scene”.

Tasks enforce strict lineage, localized mutation, and reproducibility.

3.1 Task Asset Inputs

A Task may use:

From Project:

Character Definitions (Base or Working Clones)

Scene Definitions (Base or Working Clones)

Style Definitions (Base or Working Clones)

Character Renders (base or project-level)

Scene Renders

Compilation Renders (reference-only)

From Itself:

Task-Level Clones

Definition clones

Render clones

Every Task asset is strictly local unless promoted to Project level via output renders.

3.2 Task-Level Clone Inheritance

When a Task uses a Project Definition or Project Render:

The Task automatically creates:

Immutable Task Base Clone (Definition or Render)

Mirrors the Project version used

Snapshot is taken

Not editable

The user may then create:

Task Working Clones (mutable)

Editable until used to generate a render

Become immutable once a render references them

This mirrors the Space → Project inheritance model but at Task granularity.

3.3 Render Generation Inside Tasks

Each render generated inside a Task becomes a Project Render with:

project_id

task_id

classification (Character / Scene / Compilation)

full metadata snapshots:

all definitions used

all render clones used

prompts

transformation parameters (e.g., “nighttime variant”)

Once a render is created:

Any Task clone used becomes immutable

Any Project asset referenced becomes locked per Project rules

Upstream canonical assets remain locked per Space rules

3.4 Task Deletion Rules

Deleting a Task:

Removes:

All Task-level base clones

All Task working clones

(Optional UX choice) All Task-generated renders

Unlocks:

Project Assets previously locked only due to this Task

Canonical Assets only if no remaining Tasks/Projects reference them

This ensures no dangling references.

-------------------------------------------
4. Unified Locking Model
-------------------------------------------

An asset becomes locked when anything downstream uses it:

A render references it

A Task clone references it

A Project references it

A Project Working Clone references it

A Task Render references it

A canonical render references it

Unlock only occurs when all dependent assets are deleted.

This produces an acyclic dependency graph:

Space → Project → Task → Render

No backflow.
No inconsistency.
No impossible states.

-------------------------------------------
5. Render Lineage & Snapshot Requirements
-------------------------------------------

Every render stores:

Required Snapshot Data

IDs of all definitions & renders used

Serialized JSON “state snapshot” of each definition

Serialized metadata of each render used as a reference

Prompt + parameters

Render classification

Parent Task (if any)

Parent Project

Upstream canonical references

This guarantees:

Full reproducibility

Auditing

Stable story continuity

Re-render safety even after asset evolution

-------------------------------------------
6. Summary of the Full Lineage Pipeline
-------------------------------------------
Space Canonical Definition
    ↓ import
Project Immutable Base Clone
    ↓ derive
Project Working Clone
    ↓ used in task → task clone created
Task Base Clone
    ↓ derive
Task Working Clone
    ↓ generate
Task Render (Project Render w/ task_id)


And renders follow the same chain:

Space Render
    ↓ import
Project Base Render Clone
    ↓ used in task → task clone created
Task Base Render Clone
    ↓ derive
Task Variant Render Clone
    ↓ generate
New Project Render (w/ task_id)

-------------------------------------------
7. Implementation Status Snapshot (Dec 2025)
-------------------------------------------

This document is the **north star spec**; implementation is a partial vertical slice:

- Implemented:
  - Spaces, Projects, unified `definitions` table with `root_id` / `parent_id`.
  - Minimal canonical vs. project-level definitions and simple `isLocked` rules for Space-level canonicals with project children.
  - Tasks + `rendered_assets` tables with:
    - Project-scoped tasks.
    - Per-task renders stored as `rendered_assets` rows with:
      - `project_id`, `task_id`, `file_key`, `file_url`, `metadata`, `state`.
    - Multi-character cast support and per-render prompt snapshots in `metadata`.
  - S3 + CloudFront integration for serving rendered images, with signed URLs when configured.
  - Frontend:
    - Dashboard / Space / Project views (hash-based routing).
    - Project view with per-task “cards”, per-task rendered assets, and a global **approved-only** gallery.
    - Rendered asset modal with `draft` / `approved` / `archived` state transitions.

- Not yet implemented (future work guided by this spec):
  - Full canonical / base clone / working clone hierarchy:
    - Space → Project → Task clones for definitions and renders.
  - Neutral flags and strict Character vs Scene vs Compilation render classification.
  - Automatic lock/unlock propagation across the full Space → Project → Task → Render graph.
  - Task-level clones and explicit Task deletion semantics (with automatic unlock rules).
  - Import flows for canonical renders (Space → Project) and “promote render to Asset” workflows.
  - Rich audit/replay UI for complete lineage trees.

Next thread should:
- Use `agents/handoff/handoff_04.md` + this status section to avoid duplicating implemented behavior.
- Choose a focused slice from the “Not yet implemented” list (e.g., neutral flags + render classification, or Task-level clones) and draft the next `plan_nn.md` aligned with this spec.
