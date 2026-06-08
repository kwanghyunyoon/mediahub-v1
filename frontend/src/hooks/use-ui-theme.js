import { useState, useEffect, useCallback } from "react";
import { DEFAULT_UI_THEME, UI_THEME_KEYS } from "@/lib/ui-themes";

const LS_KEY = "mh_ui_theme";

function applyTheme(key) {
  document.documentElement.setAttribute("data-ui-theme", key);
}

export function useUiTheme() {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    return UI_THEME_KEYS.includes(stored) ? stored : DEFAULT_UI_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((key) => {
    if (!UI_THEME_KEYS.includes(key)) return;
    localStorage.setItem(LS_KEY, key);
    setThemeState(key);
  }, []);

  return { theme, setTheme };
}
