import React, { createContext, useContext, useEffect, useState } from "react";

export type ColorTheme = "ember";
export type DarkMode = "light" | "dark" | "system";
export type FontStyle = "serif" | "sans";
export type Density = "default" | "airy" | "compact";

interface AppThemeState {
  colorTheme: ColorTheme;
  darkMode: DarkMode;
  fontStyle: FontStyle;
  density: Density;
  setColorTheme: (t: ColorTheme) => void;
  setDarkMode: (m: DarkMode) => void;
  setFontStyle: (f: FontStyle) => void;
  setDensity: (d: Density) => void;
  isDark: boolean;
}

const AppThemeContext = createContext<AppThemeState | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Color theme is fixed to "ember" (暗焰金)
  const colorTheme: ColorTheme = "ember";
  const setColorTheme = (_t: ColorTheme) => {};

  const [darkMode, setDarkModeState] = useState<DarkMode>(
    () => (localStorage.getItem("dark-mode") as DarkMode) ?? "light"
  );
  const [fontStyle, setFontStyleState] = useState<FontStyle>(
    () => (localStorage.getItem("font-style") as FontStyle) ?? "serif"
  );
  const [density, setDensityState] = useState<Density>(
    () => (localStorage.getItem("density") as Density) ?? "default"
  );

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Resolve dark
    let dark = false;
    if (darkMode === "dark") dark = true;
    else if (darkMode === "system") dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);

    // Apply dark class
    root.classList.toggle("dark", dark);

    // Apply color theme — always ember
    root.classList.remove("theme-teal");
    root.classList.add("theme-ember");

    // Apply font
    body.classList.toggle("font-sans", fontStyle === "sans");

    // Apply density
    body.classList.remove("density-airy", "density-compact");
    if (density !== "default") body.classList.add(`density-${density}`);
  }, [darkMode, fontStyle, density]);

  // Listen to system preference changes
  useEffect(() => {
    if (darkMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
      setIsDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [darkMode]);

  const setDarkMode = (m: DarkMode) => {
    localStorage.setItem("dark-mode", m);
    setDarkModeState(m);
  };
  const setFontStyle = (f: FontStyle) => {
    localStorage.setItem("font-style", f);
    setFontStyleState(f);
  };
  const setDensity = (d: Density) => {
    localStorage.setItem("density", d);
    setDensityState(d);
  };

  return (
    <AppThemeContext.Provider value={{ colorTheme, darkMode, fontStyle, density, setColorTheme, setDarkMode, setFontStyle, setDensity, isDark }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
