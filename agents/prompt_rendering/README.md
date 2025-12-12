# Prompt Rendering Engine — Specification

This directory defines the **Prompt Rendering Engine** for the application.

The Prompt Rendering Engine is responsible for converting structured internal
definitions into a single, well-structured natural language prompt suitable
for image generation models.

The renderer is not a generic serializer.
It is a domain-aware renderer that preserves hierarchy, intent, and constraints
while optimizing for model compliance and visual consistency.

This README defines:
- What inputs exist
- How they are ordered
- What each section is responsible for
- What must and must not appear in each section

Detailed examples are provided in separate files.

---

## Core Inputs

A rendered prompt may include the following inputs:

1. **Style Definition**
2. **One or more Character Definitions**
3. **Scene Definition**
4. **Task-Level Prompt**
5. **Speech / Thought Bubbles** (optional)
6. **Image References** (optional, role-specific)

All inputs are optional except the Task prompt.
If an input is not present, the renderer must explicitly omit it or negate it
(where required).

---

## Top-Level Prompt Order (Required)

When present, sections must appear in the following order:

1. **IMAGE REFERENCES**
2. **STYLE**
3. **CHARACTERS**
4. **SCENE**
5. **TASK**
6. **TEXT ELEMENTS**

This order must not be changed.

---

## Image References

Image references are optional but authoritative when present.

Image references must be grouped by role and clearly labeled.

Supported roles:
- Character reference images
- Scene reference images
- Style reference images (future)

Rules:
- Image references must appear before textual definitions
- Image references must not replace textual definitions
- Image references must be treated as constraints, not inspiration
- If no image references are provided, none should be implied

---

## Style Definition

The Style section defines the **visual interpretation layer**.

Style controls:
- Rendering domain
- Line and detail behavior
- Color palette behavior
- Lighting *treatment* (aesthetic, not physical)
- Rendering technique
- Style-level composition bias
- Stylistic mood

Rules:
- Style is global
- Style must not include actions
- Style must not include scene layout
- Style must not include speech or thoughts

---

## Character Definitions

The Characters section defines all persistent entities appearing in the image.

Rules:
- One block per character
- Each block is introduced by the character’s name
- Character names must be unique
- After introduction, characters are referenced only by name
- Characters must be rendered in a stable, deterministic order

Character definitions describe:
- Identity
- Physical traits
- Apparel
- Visually relevant personality cues

Character definitions must not include:
- Actions
- Scene placement
- Camera framing
- Speech or thoughts

---

## Scene Definition

The Scene section defines the **physical world**.

Scene controls:
- Setting identity
- Spatial layout
- Physical lighting
- Atmosphere
- Environmental color
- Camera and composition (scene-level)
- Props and set dressing
- Scene lore

Rules:
- Scene defines where, not what happens
- Scene must not include character actions
- Scene must not include speech or thoughts

---

## Task Prompt

The Task section defines what happens in **this specific render**.

Task controls:
- Character actions
- Interactions
- Relative positioning
- Frame-specific camera behavior (pan, zoom, reframe)
- Continuity constraints

Rules:
- Task is instance-level and not reusable
- Task must reference characters by name
- Task must not redefine characters, scene, or style

---

## Text Elements (Speech / Thought Bubbles)

Text elements are optional.

Rules:
- Speech and thought bubbles may appear only in this section
- If no text elements are provided, the renderer must explicitly state that
  no speech or thought bubbles should appear
- Text elements must not appear implicitly
- Placement guidance must be explicit

---

## Formatting Rules

The renderer must:
- Use labeled sections
- Use category headers
- Use bullet lists
- Preserve enum and tag values in human-readable form
- Avoid JSON or schema syntax
- Favor clarity over brevity

The rendered prompt should read as a **director’s brief**, not a data dump.

---

## Renderer Responsibilities

The renderer must:
- Preserve hierarchy and ordering
- Avoid inventing details
- Avoid collapsing categories
- Avoid leaking internal IDs or schema keys
- Avoid mixing responsibilities between sections
- Produce stable, readable output

Violations of these rules are considered renderer defects.

---

## Example Files

The following example files demonstrate correct output:

- `example_no_images_no_dialogue.md`  
  Two characters, one scene, one style, no image references, no speech/thought bubbles.

- `example_with_images_and_dialogue.md`  
  Two characters with character reference images, one scene with scene reference image,
  one style, with speech and thought bubbles.

These examples are normative references for expected output.

---

## Status

This README defines the authoritative contract for the Prompt Rendering Engine.

Changes to this document should be treated as breaking changes unless noted otherwise.
