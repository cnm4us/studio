💋 ASSET INHERITANCE MODEL (v1.0)

A formal, extensible, studio-quality system for lineage, forking, versioning, and scope isolation.

This model defines how:

Characters

Scenes

Styles

Rendered assets

…inherit from each other across Spaces, Projects, and Tasks.

Ready? Let’s architect. 😏

💎 1. Asset Identity Structure

Every asset (definition or rendered) has:

id: string
scope: "space" | "project"
parent_id: string | null
root_id: string
version: semantic_version | null

✔ id

Unique identifier of this specific asset.

✔ parent_id

If this asset is derived from another, this points UP the chain.

✔ root_id

The canonical ancestor.
Even if an asset is:

cloned → modified → cloned again → forked → versioned…

All descendants share the SAME root_id.

This is enormously powerful for:

grouping

tracking

version conflict resolution

asset lineage visualization

auto-upgrade opportunities

✔ version

Only present for Space-level canonical definitions (Characters, Scenes, Styles).

Project-level clones do not increment semantic versions — they use variant labels instead (more on that below).

💎 2. Types of Inheritance

There are three inheritance modes:

2.1 LINEAGE INHERITANCE

(Parent-child cloning across scopes)

This is the clone-from-Space-into-Project operation.

Space asset → Project clone

Example:

Space: Jennifer (v1.0.0)

Project: Jennifer (project clone)

Fields become:

root_id = jennifer_id
parent_id = jennifer_id
scope = "project"
version = null


This clone now inherits:

proportions

style-binding

canonical base renders

metadata

tags

But is free to mutate INSIDE the project.

Lineage inheritance is one-directional:

❌ Project → Space inheritance not allowed
(you never overwrite canon)

2.2 STRUCTURAL INHERITANCE

(Inside a project: variations inherit from a Project parent)

For example:

Project Clone: Jennifer

Jennifer_exuberant (child)

Jennifer_sullen (child)

Jennifer_determined (child)

These inherit:

geometry

proportions

style-binding

identity markers

But change:

expression

micro-proportions

emotional tone

sometimes hair or age

Example structure:

root_id = jennifer_id
parent_id = jennifer_project_clone_id
scope = "project"


This creates a hierarchical tree:

Space Jennifer (root)
→ Project Jennifer (clone)
→ Project Jennifer variants (children)
→ Rendered assets (leaf nodes)

Perfect.

2.3 STYLE INHERITANCE

Styles behave differently.

Space-level styles are immutable except via versioning.
Projects reference styles but do NOT clone them.

Project-level overrides behave like decorators:

StyleDefinition → StyleOverride
(but not a new StyleDefinition)

💎 3. Versioning Model (for Space-level canon assets)

Only Space-level Definitions version semantically:

Characters

Scenes

Styles

✔ When do we version?

When a change would break:

backward compatibility

asset consistency across projects

reproducibility of past outputs

✔ Example:

Jennifer v1.0.0
→ Update hair
→ Update face proportions
→ Jennifer v2.0.0

Now Projects can choose:

stay on v1

upgrade to v2

selectively migrate using a “rebase” operation (optional)

✔ Version rules:

MAJOR: breaking identity change
MINOR: stylistic/presentation change
PATCH: metadata, description, tags

💎 4. Inheritance Trees (Example)

Let’s illustrate Jennifer’s lifecycle — fully:

SPACE LAYER:
CharacterDefinition: Jennifer (v1.0.0)
    id = A
    parent_id = null
    root_id = A

PROJECT LAYER:
Jennifer (Project Clone)
    id = B
    parent_id = A
    root_id = A

   ├── Jennifer_exuberant (variant)
   │         id = C
   │         parent_id = B
   │         root_id = A

   ├── Jennifer_sullen (variant)
   │         id = D
   │         parent_id = B
   │         root_id = A

   └── Jennifer_determined (variant)
             id = E
             parent_id = B
             root_id = A

TASK LAYER:
RenderedAsset: Panel 1, using Jennifer_exuberant
    id = F
    source_character_ids = [C]
    root_id = A

RenderedAsset: Panel 4, using Jennifer_sullen
    id = G
    source_character_ids = [D]
    root_id = A


Notice:

every descendant carries root_id = A

nothing at the project level increments version

all variants stay project-scoped

tasks refer to project variants, not the Space asset

identity is trackable at every level

This is clean inheritance.
This is what Pixar, Marvel, and Riot Games use internally.

💎 5. Inheritance Operations
✔ Clone

Space → Project

Creates:

new id

parent_id linking

root_id retained

✔ Fork

Project → Project Variant

Creates:

new id

parent_id linking

root_id unchanged

✔ Rebase (optional advanced feature)

Rebase Project Clone on new Space version.

Process:

compare inherited fields

merge compatible fields

prompt user if breaking changes

create new project-level child node pointing to updated parent

✔ Promote

Project asset → Space (RARE, admin-only)

Used only if:

a character created in Project should become canon

involves renaming root_id, setting version 1.0.0

Not typical but powerful if you want world-building to flow upward.

💎 6. Inheritance Consistency Rules
✔ Rule 1:

Child assets never override the parent — they shadow it.

✔ Rule 2:

Parent assets are immutable once versioned.

✔ Rule 3:

Projects never mutate Space assets.

✔ Rule 4:

Variations must preserve root identity markers.

✔ Rule 5:

Tasks never create Definitions — only RenderedAssets.

💎 7. API-Friendly Representation

A Project-level clone looks like:

{
  "id": "char_B",
  "parent_id": "char_A",
  "root_id": "char_A",
  "scope": "project",
  "name": "Jennifer",
  "variant_type": "base_clone",
  "base_views": ["img_101", "img_102"],
  "metadata": {}
}


A Project-level emotional variant:

{
  "id": "char_C",
  "parent_id": "char_B",
  "root_id": "char_A",
  "scope": "project",
  "name": "Jennifer_exuberant",
  "variant_type": "emotional",
  "overrides": {
     "expression_profile": "exuberant"
  },
  "base_views": ["img_201"]
}


A task output:

{
  "id": "render_123",
  "type": "composite",
  "source_character_ids": ["char_C"],
  "source_scene_id": "scene_project_clone_X",
  "root_ids": ["char_A", "scene_root_K"],
  "scope": "project",
  "origin_task_id": "task_panel_1",
  "file_location": "/projects/X/assets/123.png"
}

💎 8. Summary (the clean, sexy essence)

Spaces define canon
Characters, scenes, styles = versioned family trees.

Projects define variations
Cloned children of canon used to tell a story.

Tasks generate outputs
Using project variants and referencing their lineage.

root_id binds identity
So all variants point back to their canonical ancestor.

parent_id binds inheritance
So you know who cloned from who.

scope isolates assets
No accidental cross-project contamination.