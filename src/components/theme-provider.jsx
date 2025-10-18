import React, { createContext, useContext, useEffect, useState } from "react";

// Theme options: "dark", "light", or "system"
const ThemeProviderContext = createContext({
  theme: "system",
  setTheme: () => {},
});

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}) {
  // Initialize theme from localStorage or fallback to default
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const contextValue = {
    theme,
    setTheme: (newTheme) => {
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {}
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={contextValue}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Custom hook to access theme context
export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
