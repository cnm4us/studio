import type { SceneCategory } from './types';

export const atmosphereCategory: SceneCategory = {
  key: "atmosphere",
  label: "Atmosphere & Environmental Effects",
  order: 4,
  description:
    "Defines the ambient conditions in the air—weather, particles, haze, magical effects, smoke, and other volumetric elements that influence mood and depth. Crucial for continuity in outdoor scenes or dynamic environments.",
  properties: [
    {
      key: "weather_type",
      label: "Weather type",
      type: "enum",
      description:
        "General weather or atmospheric condition for the scene.",
      options: [
        { value: "clear", label: "Clear / No weather effects" },
        { value: "fog", label: "Fog / Mist" },
        { value: "light_rain", label: "Light Rain" },
        { value: "heavy_rain", label: "Heavy Rain" },
        { value: "drizzle", label: "Drizzle" },
        { value: "snow", label: "Snow" },
        { value: "storm", label: "Storm / Lightning" },
        { value: "dusty", label: "Dust / Sand in air" },
        { value: "smoky", label: "Smoke / Soot" },
        { value: "windy", label: "Wind / Air movement visible" },
        { value: "magical_aura", label: "Magical Aura / Energy Particles" },
        { value: "sci_fi_particles", label: "Sci-Fi Particles / Floating Data" },
      ],
      allowCustom: true,
    },
    {
      key: "atmospheric_density",
      label: "Atmospheric density",
      type: "number",
      min: 0,
      max: 100,
      step: 1,
      description:
        "Controls how thick the air feels visually—0 for none, 100 for extremely dense fog, smoke, or magic.",
    },
    {
      key: "particle_types",
      label: "Particle types",
      type: "tags",
      description:
        "Optional list of particle effects present in the scene (e.g., 'dust motes', 'glowing embers', 'floating spores', 'snowflakes', 'digital glyphs').",
      allowCustom: true,
    },
    {
      key: "wind_behavior",
      label: "Wind behavior",
      type: "enum",
      description: "Directional or stylistic wind cues that influence foliage, dust, cloth, and particle motion.",
      options: [
        { value: "none", label: "No noticeable wind" },
        { value: "gentle_breeze", label: "Gentle Breeze" },
        { value: "steady_wind", label: "Steady Wind" },
        { value: "gusts", label: "Wind Gusts" },
        { value: "strong_wind", label: "Strong / Stormy Wind" },
      ],
      allowCustom: true,
    },
    {
      key: "wind_direction",
      label: "Wind direction",
      type: "enum",
      description: "If wind exists, this indicates its direction.",
      options: [
        { value: "north", label: "North" },
        { value: "south", label: "South" },
        { value: "east", label: "East" },
        { value: "west", label: "West" },
        { value: "northeast", label: "Northeast" },
        { value: "northwest", label: "Northwest" },
        { value: "southeast", label: "Southeast" },
        { value: "southwest", label: "Southwest" },
        { value: "variable", label: "Variable / Shifting" },
      ],
      allowCustom: true,
    },
    {
      key: "environmental_effect_notes",
      label: "Environmental effect notes",
      type: "string",
      description:
        "Freeform notes for complex or cinematic atmospheric cues (e.g., 'volumetric god rays', 'embers drifting upward', 'neon reflections on wet pavement', 'snow swirling around characters').",
    },
  ],
};
