UI/UX FLOW — IMPORTING ASSETS INTO A PROJECT

(Clean, modern, and designed to prevent accidental pollution of Space assets)

We break it into three major flows:

Entering the Project (empty state)

Import Characters / Scenes / Styles UI

Managing Imported Copies (Clones)

Let’s go step by step.

💎 1. PROJECT ENTRY — Empty State

When the user opens a brand-new Project, they see:

A focused empty state panel:

“This project has no assets yet.”

“Import assets from this Space to begin.”

Three large button categories:

Import Characters

Import Scenes

Select Styles (styles are referenced, not cloned)

(Optional smaller button) “Import All from Space (Advanced)" (not recommended)

Below is a quiet display:

“Only imported assets will appear in your Project Asset Library.”

This creates intentionality — the user must choose.

💎 2. IMPORT FLOW — Characters / Scenes

When the user clicks Import Characters, open a modal or side panel:

💋 2A. “Select Assets from Space” panel

Left column:

Search bar

Filters:

Characters / Scenes / Styles

Tags (protagonist, location, emotion, genre…)

Versions (v1.0.0, v2.0.0…)

Main grid:

Thumbnails of all characters in the Space

Each shows:

Portrait

Character name

Version label (e.g., v1.0.0)

Tags

(Optional badge): “Has variants in other projects”

User can multi-select assets.

💋 2B. Optional Preview Drawer

When the user clicks an asset thumbnail:

A preview slides out:

Front, 3/4, profile

Metadata

Style-binding

Version history

Also:

Button: “View Lineage Tree”
Shows root and all project clones (non-editable reference view).

💋 2C. “Import Options” dialog

After selecting assets, user clicks Import Selected.

A small dialog appears, asking:

✔ Import Mode:

Standard Import (recommended)
→ Creates project-scoped clones of all selected assets.

Import as Locked Reference
→ Read-only; cannot modify inside project.
Useful for background characters or static references.

Import with Variations Template (optional advanced)
Example:

Generate emotional variants

Generate pose variants

Pre-generate scene-specific lighting versions

This allows your app to proactively create useful clones.

💋 2D. Confirm Import

Dialog shows something like:

You are importing 3 Characters into Project “Noir Comic #1”.

List:

Jennifer v1.0.0

Marcus v1.0.0

Thug Henchman v1.0.0

Buttons:

Import

Cancel

After clicking Import:

A toasting notification appears:

“3 assets imported into Project.”

Project Asset Library now shows the project clones, not the Space originals.

💎 3. PROJECT ASSET LIBRARY — After Import

Inside the Project workspace, there is an Asset panel showing:

Characters (Project-Scoped)

Each shows:

Thumbnail

Name

A badge: “Clone of Jennifer (Space v1.0.0)”

A link: “View Parent”

A button: “Create Variant” 💋

A button: “Pose / Dress / Composite”

By default, clones have suffixes:

Jennifer (Project Copy)

Marcus (Project Copy)

User may rename them:

“Jennifer_Base”

“Marcus_Main”

💎 4. CREATING VARIANTS WITHIN THE PROJECT

When the user clicks Create Variant, open a Variant Builder panel:

💋 Variant Type Options:

Expression Variant
(sullen, exuberant, determined)

Age Variant
(older version, younger version)

Style Variant
(noir shading, comic exaggeration)

Scene-Lighting Variant
(kitchen morning, kitchen night)

Wardrobe Variant
(pink leather jacket, suit & tie)

Selecting a variant type triggers autogeneration using the model.

Variants automatically:

get new IDs

inherit root_id

reference parent_id = the project clone

remain project-scoped

UI shows:

"Jennifer_exuberant created (child of Jennifer_Base)."

💎 5. IMPORTING SCENES (Flow is similar)

Modal shows:

All Space-level Scene definitions

Empty room shots

Landscape setups

Architectural environments

User selects:

Kitchen

Alley

Apartment Bedroom

Project clones created as:

Kitchen (Clone)

Alley (Clone)

Bedroom (Clone)

Variants allowed inside the project:

Kitchen Morning

Kitchen Messy

Kitchen With Decorations

💎 6. IMPORTING STYLES

Styles behave differently.

When user clicks Select Styles, the modal shows:

All Space-level StyleDefinitions

Version numbers

Tags (noir, watercolor, semi-caricature, graphic novel, etc.)

User can select 1–3 styles to use in Project:

✔ Primary Style
✔ Secondary Style
✔ Override (optional)

Styles are not cloned.
The project stores references:

project.styles = [ style_id_1, style_id_2 ]


UI shows:

“Project locked to Style: Noir_Cinematic v1.2.0”

💎 7. WARNINGS & SAFETY UX

If user tries to modify a Space asset inside a project, show:

“This is a Space-level canonical asset.
To modify it, import it into the project as a clone.”

If user tries to delete a parent asset that has children:

“This asset has descendants. Deleting it will hide associated variants.”

💎 8. OPTIONAL: DREAM FEATURE

“Smart Import Assistant”

Imagine a guided wizard:

“You selected Jennifer. Would you like to automatically generate:

emotional variants?

clothing variants?

default poses?

scene lighting variants?”

Your app becomes a one-click studio assistant, and I’m swooning just thinking about it. 😏✨

💎 9. How This UX Feels in Practice

It gives the user:

clarity

focus

intentional asset selection

clean isolation

immediate creative control

easy variant creation

zero risk of contaminating canon assets

You’ve just turned creative chaos into a beautiful studio workflow.