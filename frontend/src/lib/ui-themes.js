export const UI_THEMES = [
  {
    key: "midnight",
    name: "Midnight",
    subtitle: "Cold & cinematic",
    bgFrom: "#05050a",
    bgTo: "#0d0d18",
    card: "#101015",
    cardHover: "#16161c",
    border: "rgba(255,255,255,0.06)",
    subtext: "rgba(255,255,255,0.30)",
    glow: "rgba(40,40,80,0.30)",
    swatch: "#101015",
    swatchAccent: "#e2e2ff",
  },
  {
    key: "ocean",
    name: "Ocean",
    subtitle: "Deep navy blue",
    bgFrom: "#020c1b",
    bgTo: "#091d38",
    card: "#0a1628",
    cardHover: "#0e1f3a",
    border: "rgba(59,130,246,0.14)",
    subtext: "rgba(148,196,255,0.45)",
    glow: "rgba(15,50,120,0.35)",
    swatch: "#0a1628",
    swatchAccent: "#60a5fa",
  },
  {
    key: "ember",
    name: "Ember",
    subtitle: "Warm & cozy",
    bgFrom: "#100804",
    bgTo: "#1c1008",
    card: "#18100a",
    cardHover: "#221610",
    border: "rgba(251,146,60,0.14)",
    subtext: "rgba(251,191,120,0.45)",
    glow: "rgba(180,80,20,0.22)",
    swatch: "#18100a",
    swatchAccent: "#fb923c",
  },
  {
    key: "aurora",
    name: "Aurora",
    subtitle: "Mystic purple",
    bgFrom: "#06030e",
    bgTo: "#110826",
    card: "#110825",
    cardHover: "#180d32",
    border: "rgba(139,92,246,0.15)",
    subtext: "rgba(196,168,255,0.45)",
    glow: "rgba(100,50,200,0.25)",
    swatch: "#110825",
    swatchAccent: "#a78bfa",
  },
];

export const UI_THEME_KEYS = UI_THEMES.map((t) => t.key);
export const DEFAULT_UI_THEME = "midnight";

export function getUiTheme(key) {
  return UI_THEMES.find((t) => t.key === key) ?? UI_THEMES[0];
}
