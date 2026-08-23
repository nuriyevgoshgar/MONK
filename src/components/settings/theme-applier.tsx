"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

// Writes the choice onto <html> so the CSS variables in globals.css can react.
// "system" removes the attribute and lets prefers-color-scheme decide.
export function ThemeApplier() {
  const { theme } = useSettings();

  useEffect(() => {
    // Always stamped, "system" included: with no attribute the CSS falls back
    // to dark, which is what an unconfigured install should look like.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
