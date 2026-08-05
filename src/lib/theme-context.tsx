"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

const STORAGE_KEY = "forecastify-theme";

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
}

let transitionTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Crossfade the swap instead of hard-cutting. The transition class is added
 * only for the duration of the change — leaving it on would make every
 * unrelated colour change animate for the rest of the session.
 */
function applyThemeAnimated(next: Theme) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    applyTheme(next);
    return;
  }

  root.classList.add("fx-theme-transition");
  applyTheme(next);
  clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => root.classList.remove("fx-theme-transition"), 260);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Matches the pre-paint script in the root layout, which has already
  // applied the class by the time this mounts.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  // Light is the primary Forecastify experience; dark stays an explicit choice.
  // Keep this tab in step with a toggle made in another one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next: Theme = e.newValue === "dark" ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage unavailable (private mode) — the theme still applies for this session.
      }
      applyThemeAnimated(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
