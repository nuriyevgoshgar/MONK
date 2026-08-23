"use client";

import { useEffect } from "react";

// Registered from the client after hydration. Only in production: a service
// worker in front of the dev server serves stale chunks and makes edits look
// like they did not apply.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration fails on insecure origins and in private windows; the
      // app works fine without it, minus offline support.
    });
  }, []);

  return null;
}
