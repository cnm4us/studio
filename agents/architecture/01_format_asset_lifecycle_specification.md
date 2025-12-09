Below is a Formal Asset Lifecycle Spec (v1) you can hand to Codex as a baseline.
We can refine or expand later into separate docs (DB schema, APIs, etc.), but this gives you a clean, implementable model.

1. Terminology

Space – User-owned creative universe: canonical characters, scenes, styles.

Project – Story/production within a Space. Uses cloned assets from the Space.

Task – Atomic work unit inside a Project (e.g., “Generate Page 1 Panel 3”).

Definition Asset – Abstract description:

CharacterDefinition

SceneDefinition

StyleDefinition

Rendered Asset – Generated media (e.g. images, reference sheets).

Composite Asset – Rendered result that combines character(s) + scene + style.

2. Asset Types (Top-Level)
2.1 CharacterDefinition

Represents a character concept, not a single image.

Key fields (conceptual):

id

scope: "space" | "project"

parent_id: optional (for project clones)

name

description

canonical_tags (e.g., “protagonist”, “villain”)

proportion_profile (realistic, semi-caricature, etc.)

style_binding (optional binding to a default StyleDefinition)

base_views (references to RenderedAssets: portrait, 3/4, profile, full-body)

metadata (JSON blob for custom attributes)

2.2 SceneDefinition

Represents an environment concept.

id

scope: "space" | "project"

parent_id

name

description

location_type (kitchen, alley, beach, spaceship bridge)

base_layout (neutral layout description)

style_binding (optional)

base_views (RenderedAssets: wide shot, mid, close-up anchors)

metadata

2.3 StyleDefinition

Represents a visual language, not tied to specific story.

id

scope: "space" only

name

description

categories (coreStyle, line/detail, color/lighting, etc.)

parameters (JSON of knobs: saturation, line-weight, grain, etc.)

version (semantic: 1.0.0)

metadata

2.4 RenderedAsset

Any generated visual output that is not itself a definition, e.g.:

Character reference sheet

Posed mannequin

Dressed mannequin

Empty scene angle

Composite frame

id

type: "character_ref" | "scene_ref" | "pose_ref" | "composite" | ...

scope: "space" | "project" | "task" (task outputs ultimately owned by project)

owner_project_id (optional)

source_character_ids (array)

source_scene_id

style_id

generation_context (prompt, parameters, model)

file_location

metadata

3. Asset Scopes
3.1 Space-Scoped Assets

These are your canon:

Space-level CharacterDefinition

Space-level SceneDefinition

All StyleDefinitions

Optional: some base RenderedAssets (e.g., neutral character references, neutral scenes)

Rules:

Must remain stable for re-use.

Can only be edited via versioning operations (create new version).

Used as parents when cloning into Projects.

3.2 Project-Scoped Assets

These are production-specific derivatives:

Project-level CharacterDefinition (clones of space-level definitions)

Project-level SceneDefinition (clones)

Project-level RenderedAssets (poses, dressed characters, scene variants, composites)

Rules:

Can be freely modified within the project.

Never automatically propagate changes back to the Space.

Can optionally indicate parent_id for traceability.

3.3 Task-Scoped Outputs

Tasks produce:

ephemeral RenderedAsset variants

draft composites

These are owned by the Project, but associated with a Task for history:

scope = "project"

origin_task_id = <task_id>

You can choose to:

mark some as final and surfaced in the Project asset library,

or leave them as internal drafts.

4. Lifecycle States

All Definition Assets (character, scene, style) and important RenderedAssets share a simple state machine.

4.1 States

draft – being created/refined; not yet canonical.

canonical – approved, stable, usable as a parent.

deprecated – kept for history; should not be used for new work.

archived – hidden from normal UIs; preserved for audit/history.

You may also want:

experimental – for wilder R&D assets that aren’t ready for production.

4.2 Valid Transitions

For Space-scoped definitions:

draft → canonical

draft → archived

canonical → deprecated

deprecated → archived
(rarely) canonical → archived (with warning)

For Project-scoped definitions:

draft → canonical (project-canonical)

canonical → deprecated

deprecated → archived

draft → archived

For RenderedAssets:

draft → approved (final or reusable)

draft → discarded

approved → archived

(RenderedAssets don’t usually go “canonical” – they’re outcomes, not templates.)

5. Core Lifecycle Flows

Let’s walk through the critical flows you and Codex will care about.

5.1 CharacterDefinition – Space Lifecycle

Goal: define a reusable, canonical character.

Create Character in Space

State: draft

Generate base portrait, 3/4, profile, full-body (neutral background, mannequin mode).

Attach these as base_views RenderedAssets.

Refine

Iterate on proportions, features, style-binding.

Possibly generate alternate style references (still Space-level R&D).

Publish

Transition: draft → canonical.

Character is now available to all Projects inside this Space.

Versioning

To significantly change the character (e.g., redesign), create new CharacterDefinition:

parent_id = old_character.id

version = 2.0.0, old one deprecated.

5.2 CharacterDefinition – Project Lifecycle

Goal: use / specialize canon characters within a story.

Import (Clone) from Space

User selects character(s) from Space.

System creates Project-level clones:

scope = "project"

parent_id = <space_character_id>

state = "draft"

Copies base_views references.

Modify in Project
Examples:

define emotional variants:

Jennifer_exuberant, Jennifer_sullen, Jennifer_determined

change hairstyle for this story only

add project-specific tags or notes

Lock Project Canon

For characters the project will use heavily:

draft → canonical (project-level canonical)

These become the “go-to” forms when Tasks generate frames.

Retire Variants

If a variant is no longer used:

canonical → deprecated → archived (eventually)

5.3 SceneDefinition – Space & Project Lifecycle

Same pattern as characters:

Space:

draft neutral base environment (empty kitchen, alley, sci-fi bridge)

set to canonical once happy.

Project:

clone Scene into project.

create:

Kitchen_morning

Kitchen_evening

Kitchen_messy

lock those as project-canonical versions.

5.4 StyleDefinition Lifecycle

Styles are Space-only.

Create style in Space as draft.

Iterate on parameters & test images.

Promote to canonical when stable.

If style should no longer be used:

canonical → deprecated.

Optionally archive very old/unwanted styles.

Projects may reference a style version, but do not own styles.
Project can add style overrides, but those are separate, project-scoped objects (e.g. StyleOverride).

5.5 RenderedAsset Lifecycle

Generated as draft

from a Task or Space-level generation.

Example: new posed mannequin, new scene angle, composite panel.

User decision

Mark as:

approved – keep as reusable or final, show in UI.

discarded – not shown in UI (can be hard-deleted later).

Archiving

For long-lived projects or completed ones:

approved → archived
(still retained but hidden unless “show archived” is toggled).

6. Cloning & Inheritance Rules
6.1 Inheritance Fields

When cloning from Space → Project:

parent_id = original_id

inherits_from_type = "character" | "scene" | "style" (for traceability)

inherited_version = original.version (if you want style/character versioning)

6.2 Update Behavior

Updates to a Space-level asset do NOT automatically mutate existing Projects.

You may optionally support:

“Check for parent updates”

“Rebase this Project asset on new Space version” (manual operation).

7. Asset Access Rules by Layer
7.1 In Space

Can:

create draft definitions

promote to canonical

version canon

generate reference RenderedAssets tied to canonical definitions

Cannot:

see or edit project-scoped clones

do story-specific tailoring here

7.2 In Project

Can:

import (clone) Space assets

modify project-scoped copies

create project-only variants

generate posed, dressed, and composite RenderedAssets

mark certain RenderedAssets as “final panels”

Cannot:

edit the original Space assets directly

change StyleDefinitions themselves (only use or override)

7.3 In Task

Can:

reference all project-scoped definitions & styles

produce RenderedAssets

save or discard outputs

Cannot:

define new Character/Scene/StyleDefinitions directly (tasks are consumers, not definers)

8. Example: Jennifer’s Lifecycle

In Space

Create CharacterDefinition: Jennifer

Generate neutral refs

Set state: canonical

In Project “Breakup Comic #1”

Import Jennifer → Jennifer (project clone)

Create:

Jennifer_exuberant

Jennifer_sullen

Jennifer_determined

Mark these 3 as canonical (project-level)

In Tasks

Task 1: “Page 1, Panel 1”

use Jennifer_exuberant + LivingRoom_scene_morning + ComicStyle_v1

output composite frame → approved

Task 2: “Page 1, Panel 4”

use Jennifer_sullen + same scene

All of this leaves the Space-level Jennifer pristine.