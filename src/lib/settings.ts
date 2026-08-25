"use client";

import { useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "dark" | "light";

export type Settings = {
  theme: ThemeChoice;
  defaultSpeed: number;
};

const STORAGE_KEY = "monk.settings";

// Dark first, as the design calls for. Light is opt-in, and "system"
// hands the choice to the operating system.
const DEFAULTS: Settings = { theme: "dark", defaultSpeed: 1 };

const listeners = new Set<() => void>();

// getSnapshot must return a stable reference or useSyncExternalStore loops, so
// the parsed value is cached and only replaced when it actually changes.
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;

  if (typeof window === "undefined") return DEFAULTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};

    cache = {
      theme: parsed.theme ?? DEFAULTS.theme,
      defaultSpeed: parsed.defaultSpeed ?? DEFAULTS.defaultSpeed,
    };
  } catch {
    cache = DEFAULTS;
  }

  return cache;
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked — the change still applies for this session.
  }

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getServerSnapshot = () => DEFAULTS;

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}
