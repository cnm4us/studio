# Example — Two Characters, With Images and Dialogue

This example demonstrates a fully rendered prompt with:
- Two characters with character reference images
- One scene with a scene reference image
- One style definition
- Speech and thought bubbles included

---

## REQUEST FORMAT THAT INCLUDES IMAGES


request = {
  prompt_text: "<rendered prompt from prompt_rendering>",
  image_inputs: [
    { role: "character:Sally:identity", url: "https://signed-url/..." },
    { role: "character:Sally:pose",     url: "https://signed-url/..." },
    { role: "character:John:identity",  url: "https://signed-url/..." },
    { role: "scene",                    url: "https://signed-url/..." }
  ]
}

The exact placement of imageInputs depends on the client library (e.g., Google GenAI SDK, Vertex AI REST, or Firebase AI Logic)

---

## IMAGE REFERENCES

CHARACTER IMAGE REFERENCES:
- Sally: canonical 3/4 view, neutral lighting, neutral background
- Sally: pose reference — bending down tying her shoe
- John: canonical 3/4 view, neutral lighting, neutral background

SCENE IMAGE REFERENCES:
- Urban alleyway at night, wide framing, wet pavement, neon signage

---

## STYLE

Core Style:
- Render domain: Semi-realistic illustration
- Genre influences: urban, noir
- Visual influences: cinematic realism, graphic novel tone

Line & Detail:
- Line weight: clean, medium
- Detail level: high on characters, simplified backgrounds

Light Treatment:
- Lighting style: dramatic light, rim lighting

Color:
- Palette: limited palette with neon accents
- Saturation: medium

Rendering Technique:
- Painterly digital rendering
- Subtle film grain

Composition Bias:
- Cinematic framing
- Rule of thirds

Mood & Atmosphere:
- Tense
- Urban
- Nighttime

---

## CHARACTERS

CHARACTER — Sally:
Core Identity:
- Gender: woman
- Age range: late 20s
- Height: average
- Body type: lean
- Ethnicity cues: East Asian features

Hair:
- Color: black
- Length: shoulder-length
- Texture: straight

Skin:
- Light-medium tone

Clothing:
- Dark teal jacket
- Black leggings
- White sneakers

Personality Keywords:
- Focused
- Slightly anxious

Archetype:
- Urban survivor

---

CHARACTER — John:
Core Identity:
- Gender: man
- Age range: early 30s
- Height: tall
- Body type: athletic
- Ethnicity cues: Northern European features

Hair:
- Color: brown
- Length: short
- Texture: wavy

Skin:
- Light tone

Clothing:
- Dark hoodie
- Black trousers
- Casual shoes

Personality Keywords:
- Protective
- Alert

Archetype:
- Watchful companion

---

## SCENE

Core Scene Identity:
- Setting type: urban alley
- Genre: noir, cyberpunk
- Time period: near future
- Narrative role: tension point

Spatial Layout:
- Environment scale: narrow
- Geometry: long alley corridor
- Key landmarks: neon sign on right wall, fire escape above
- Anchor prop: flickering streetlight

Lighting:
- Time of day: night
- Primary light source: neon signage
- Light direction: side-right
- Light temperature: mixed cool and magenta
- Shadow style: high contrast
- Lighting intensity: low

Atmosphere:
- Weather: light rain
- Atmospheric density: moderate
- Particle types: rain droplets, mist

Color Environment:
- Dominant colors: concrete gray, neon magenta, deep blue
- Accent colors: neon cyan
- Restricted colors: no warm yellows
- Ambient color tone: cool blue
- Surface materials: wet asphalt, brushed metal
- Sky color: overcast night sky
- Light reflection colors: neon magenta reflection, cool blue reflection
- Color notes: wet surfaces emphasize reflections

Camera & Composition:
- Default camera angle: eye-level
- Shot type: medium-wide
- Focal length: wide (~35mm)
- Allowed movements: slight pan right
- Composition rules: rule of thirds

Props & Set Dressing:
- Major props: dumpsters, metal doors
- Minor props: posters, cables
- Forbidden objects: vehicles

Scene Lore:
- Back alley known for black-market exchanges

---

## TASK

Render a single frame.

- Sally is bending down near the streetlight, tying her shoe.
- John stands a few steps behind Sally, watching the alley entrance.
- Keep Sally in the left third of the frame.
- Maintain consistent lighting, outfits, and environment.
- Do not introduce new props or characters.

---

## TEXT ELEMENTS

Speech Bubbles:
- Add a speech bubble above John: “We don’t have much time.”

Thought Bubbles:
- Add a thought bubble above Sally: “Not again… these laces.”

Placement Notes:
- Place bubbles so they do not cover faces.
- Use clean, readable lettering consistent with the style.
