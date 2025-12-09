💎 1. HIGH-LEVEL ARCHITECTURE (API → Services → DB)

Your system naturally breaks into services:

SpaceService

ProjectService

TaskService

AssetService

RenderService (wraps image models)

LineageService

StyleService

SceneService

But we’ll start at the clean interface Codex will implement:

💋 2. API LAYER (REST or GraphQL)

You can do this as REST or GraphQL.
REST is easier to hand to Codex; GraphQL is sexier for UI devs.

I’ll give you the REST structure (simple, conventional):

🧡 2.1 SPACE ENDPOINTS

Create, list, update, view.

POST /spaces

Create a new creative universe.

GET /spaces

List user-owned spaces.

GET /spaces/{spaceId}

Return space metadata + assets summary.

🧡 2.2 CHARACTER DEFINITIONS (SPACE-SCOPED)
GET /spaces/{spaceId}/characters

List canonical + draft characters in the space.

POST /spaces/{spaceId}/characters

Create new CharacterDefinition (draft).

GET /characters/{charId}

Retrieve full definition.

PATCH /characters/{charId}

Edit metadata, tags, description (if draft).

POST /characters/{charId}/publish

draft → canonical.

POST /characters/{charId}/version

Clone + version (creates v2.0.0).

🧡 2.3 SCENES (SPACE-SCOPED)
Similar to Characters:

/spaces/{spaceId}/scenes
/scenes/{sceneId}
/scenes/{sceneId}/publish
/scenes/{sceneId}/version

🧡 2.4 STYLES (SPACE-SCOPED)
POST /spaces/{spaceId}/styles

Create a new style (draft).

PATCH /styles/{styleId}

Modify draft style parameters.

POST /styles/{styleId}/publish

Make canonical.

POST /styles/{styleId}/version

Semantic version cloning.

🧡 2.5 PROJECT ENDPOINTS
POST /spaces/{spaceId}/projects

Create a new project.

GET /projects/{projectId}

View metadata + imported assets.

POST /projects/{projectId}/import

Body:

{
  "characters": ["char_A", "char_B"],
  "scenes": ["scene_X"],
  "styles": ["style_noir_1_2_0"]
}


This triggers Space → Project cloning (for characters & scenes).
Styles are referenced, NOT cloned.

GET /projects/{projectId}/characters

List project-level clones & variants.

🧡 2.6 VARIANTS (PROJECT-SCOPED)
POST /projects/{projectId}/characters/{charId}/variants

Create a variant:

{
  "type": "expression",
  "label": "exuberant",
  "modifiers": {
    "expression_profile": "exuberant",
    "micro_adjustments": {}
  }
}


Returns:

{
  "id": "char_C",
  "parent_id": "char_clone_B",
  "root_id": "char_A",
  "scope": "project"
}

🧡 2.7 TASKS & RENDERING
POST /projects/{projectId}/tasks

Create a task.

POST /tasks/{taskId}/render

Body:

{
  "character_ids": ["char_variant_J1"],
  "scene_id": "scene_variant_K3",
  "style_id": "style_noir_1_2_0",
  "instructions": "Place Jennifer in kitchen scene, 3/4 angle, match lighting."
}


Response:

{
  "render_id": "render_123",
  "file": "/projects/Noir1/outputs/panel07.png",
  "source_character_ids": ["char_variant_J1"],
  "source_scene_id": "scene_variant_K3",
  "style_id": "style_noir_1_2_0",
  "origin_task_id": "task_panel07"
}

💎 3. DATABASE SCHEMA (SQL-FRIENDLY, sexy as hell)

Here is a clean relational schema that respects lineage & hierarchy.

💋 TABLE: spaces
spaces (
  id               uuid pk,
  user_id          uuid fk,
  name             text,
  description      text,
  created_at       timestamp
)

💋 TABLE: definitions

Shared table for characters, scenes, styles.

definitions (
  id               uuid pk,
  type             enum('character','scene','style'),
  scope            enum('space','project'),
  space_id         uuid fk null,
  project_id       uuid fk null,
  parent_id        uuid fk null,
  root_id          uuid fk,
  name             text,
  description      text,
  metadata         jsonb,
  version          text null,
  state            enum('draft','canonical','deprecated','archived'),
  created_at       timestamp
)


This is the powerhouse table, baby.
Variants, clones, originals — all live here.

💋 TABLE: rendered_assets
rendered_assets (
  id                 uuid pk,
  project_id         uuid fk,
  type               text,        -- 'pose', 'dress', 'composite', etc
  file_path          text,
  thumbnail_path     text,
  source_character_ids uuid[] fk references definitions(id),
  source_scene_id    uuid fk references definitions(id),
  style_id           uuid fk references definitions(id),
  origin_task_id     uuid fk,
  generation_context jsonb,
  state              enum('draft','approved','archived'),
  created_at         timestamp
)

💋 TABLE: tasks
tasks (
  id                 uuid pk,
  project_id         uuid fk,
  name               text,
  description        text,
  status             enum('pending','running','completed','failed'),
  created_at         timestamp
)

💋 TABLE: projects
projects (
  id              uuid pk,
  space_id        uuid fk,
  name            text,
  description     text,
  created_at      timestamp
)

💋 TABLE: project_styles (reference binding)
project_styles (
  project_id    uuid fk,
  style_id      uuid fk,
  is_primary    boolean,
  overrides     jsonb
)

💎 4. INHERITANCE IN THE DB

When you clone a Space asset into a Project:

new row in definitions

scope = 'project'

parent_id = original_id

root_id = original.root_id

version = null (project assets don’t version semantically)

When you create a variant:

parent_id = clone_id

root_id still inherited from original Space character

Perfect lineage.

💋 5. HOW THIS SYSTEM BEHAVES IN PRACTICE
✔ Space = library of truth
✔ Project = sandbox using cloned assets
✔ Variants = children of project clones
✔ Tasks = render engines
✔ RenderedAssets = stamped outputs with lineage metadata

The API supports:

cloning

variant creation

style binding

compositing

regeneration

version locking

scene variant workflows

And the DB schema supports:

querying all assets by root identity

regeneration of all panels involving a character

multi-project reuse

isolation

version control

lineage tree visualization