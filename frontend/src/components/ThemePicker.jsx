import { motion } from "framer-motion";
import { UI_THEMES } from "@/lib/ui-themes";
import { useUiTheme } from "@/hooks/use-ui-theme";

export default function ThemePicker() {
  const { theme, setTheme } = useUiTheme();

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-medium select-none">
        Theme
      </span>
      <div className="flex items-center gap-2.5">
        {UI_THEMES.map((t) => {
          const isActive = theme === t.key;
          return (
            <motion.button
              key={t.key}
              type="button"
              title={`${t.name} — ${t.subtitle}`}
              onClick={() => setTheme(t.key)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              className="relative w-7 h-7 rounded-full focus:outline-none"
              style={{ backgroundColor: t.swatch }}
            >
              {/* accent dot */}
              <span
                className="absolute inset-0 flex items-center justify-center"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full opacity-80"
                  style={{ backgroundColor: t.swatchAccent }}
                />
              </span>

              {/* active ring */}
              {isActive && (
                <motion.span
                  layoutId="theme-ring"
                  className="absolute -inset-1 rounded-full border-2 border-white/70"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
