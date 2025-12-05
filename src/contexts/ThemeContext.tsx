import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "sepia";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggle: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved) return saved;

      // Preferência do sistema
      if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
    } catch {}

    return "light";
  });

  // APLICA O TEMA AO <html>
  useEffect(() => {
    const html = document.documentElement;

    html.classList.remove("light", "dark", "sepia");
    html.classList.add(theme);

    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  // Alterna entre claro → escuro → sépia
  const toggle = () =>
    setTheme((t) =>
      t === "light" ? "dark" : t === "dark" ? "sepia" : "light"
    );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
