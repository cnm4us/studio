import type { StyleCategory } from './types.js';

export const coreStyleCategory: StyleCategory = {
  key: "core_style",
  label: "Core Style",
  order: 1,
  description:
    "High-level style identity that describes what kind of visual world this style belongs to.",
  properties: [
    {
      key: "render_domain",
      label: "Render domain",
      type: "enum",
      description:
        "Overall rendering family for this style (e.g., comic, anime, painterly, photorealistic).",
      options: [
        { value: "comic_illustration", label: "Comic Illustration" },
        { value: "manga_anime", label: "Manga / Anime" },
        { value: "cartoon", label: "Cartoon" },
        { value: "concept_art", label: "Concept Art" },
        { value: "painterly", label: "Painterly Illustration" },
        { value: "semi_realistic", label: "Semi-Realistic Illustration" },
        { value: "photorealistic", label: "Photorealistic" },
        { value: "3d_render", label: "3D Render" },
        { value: "pixel_art", label: "Pixel Art" },
      ],
      allowCustom: true,
    },
    {
      key: "genre",
      label: "Genre / subject focus",
      type: "tags",
      description:
        "Broad genre cues this style is best suited for (e.g., fantasy, sci-fi, slice of life).",
      options: [
        { value: "fantasy", label: "Fantasy" },
        { value: "sci_fi", label: "Sci-Fi" },
        { value: "urban", label: "Urban / Street" },
        { value: "slice_of_life", label: "Slice of Life" },
        { value: "romance", label: "Romance" },
        { value: "horror", label: "Horror" },
        { value: "noir", label: "Noir" },
        { value: "historical", label: "Historical" },
      ],
      allowCustom: true,
    },
    {
      key: "influences",
      label: "Visual influences",
      type: "tags",
      description:
        "Optional shorthand for influences or reference traditions (e.g., European BD, Saturday-morning cartoon, studio-style animation).",
        options: [
        { value: "european_bd", label: "European BD / Ligne Claire" },
        { value: "american_comic", label: "American Comic" },
        { value: "manga_anime", label: "Manga / Anime" },
        { value: "webtoon", label: "Webtoon / Vertical" },
        { value: "concept_art_fantasy", label: "Fantasy Concept Art" },
        { value: "concept_art_scifi", label: "Sci-Fi Concept Art" },
        { value: "storybook", label: "Storybook Illustration" },
        { value: "watercolor", label: "Watercolor Illustration" },
        { value: "art_nouveau", label: "Art Nouveau" },
        { value: "art_deco", label: "Art Deco" },
        { value: "vaporwave", label: "Vaporwave / Synthwave" },
        { value: "film_noir", label: "Film Noir" },
        { value: "retro_futurism", label: "Retro Futurism" },
        { value: "saturday_morning_cartoon", label: "Saturday Morning Cartoon" },
        { value: "ghibli_like", label: "Ghibli Influence" },
        { value: "digital_painterly", label: "Digital Painterly" },
      ],
      allowCustom: true,
    },
  ],
};
