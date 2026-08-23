"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

// Writes the choice onto <html> so the CSS variables in globals.css can react.
// "system" removes the attribute and lets prefers-color-scheme decide.
export function ThemeApplier() {
  const { theme } = useSettings();

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  return null;
}
