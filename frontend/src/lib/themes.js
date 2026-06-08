// Curated theme registry. Themes apply via `data-theme` attribute on the
// ProfileShell root. Each preset is a small bundle of palette + typography
// hints. CSS overrides in index.css read the data-theme value and apply tonal
// shifts; ProfileShell renders extra elements (hero banner) for some themes.

export const THEMES = [
  {
    key: "default",
    name: "Default",
    subtitle: "Clean dark monochrome",
    swatch: "#FFFFFF",
    suggestedColor: "#FFFFFF",
  },
  {
    key: "western",
    name: "Westwood Ranch",
    subtitle: "Rugged cinematic west",
    swatch: "#C2410C",
    suggestedColor: "#C2410C",
  },
  {
    key: "neon",
    name: "Neon Arcade",
    subtitle: "Cyberpunk magenta glow",
    swatch: "#FF2D87",
    suggestedColor: "#FF2D87",
  },
  {
    key: "studio",
    name: "Studio Loft",
    subtitle: "Warm monochrome serif",
    swatch: "#D4A574",
    suggestedColor: "#D4A574",
  },
  {
    key: "kids",
    name: "Kids Zone",
    subtitle: "Big-card kid-friendly UI",
    swatch: "#FFD700",
    suggestedColor: "#FF6B00",
  },
];

export const THEME_KEYS = THEMES.map((t) => t.key);

export function getTheme(key) {
  return THEMES.find((t) => t.key === key) || THEMES[0];
}
