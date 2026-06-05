import {
  User,
  Film,
  Music,
  Tv,
  Gamepad2,
  Heart,
  BookOpen,
  Camera,
  Headphones,
  Star,
  Palette,
  Coffee,
  Sparkles,
  Rocket,
  Ghost,
  Crown,
  Mic2,
  Disc3,
  Clapperboard,
  Joystick,
  Library,
  Image as ImageIcon,
  Drama,
  Popcorn,
} from "lucide-react";

// Curated icon library — admin picks from these
export const ICONS = {
  User,
  Film,
  Music,
  Tv,
  Gamepad2,
  Heart,
  BookOpen,
  Camera,
  Headphones,
  Star,
  Palette,
  Coffee,
  Sparkles,
  Rocket,
  Ghost,
  Crown,
  Mic2,
  Disc3,
  Clapperboard,
  Joystick,
  Library,
  Image: ImageIcon,
  Drama,
  Popcorn,
};

export const ICON_NAMES = Object.keys(ICONS);

export const getIcon = (name) => ICONS[name] || User;

// Curated color palette
export const COLOR_SWATCHES = [
  { name: "Crimson", value: "#E11D48" },
  { name: "Emerald", value: "#10B981" },
  { name: "Azure", value: "#3B82F6" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Lime", value: "#84CC16" },
];

export const hexToRgb = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "255,255,255";
  const int = parseInt(m[1], 16);
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
};
