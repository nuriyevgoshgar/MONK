"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
// Assume online on the server: showing the banner during hydration and then
// hiding it would flash on every page load.
const getServerSnapshot = () => true;

// Says plainly what still works rather than leaving failed requests to be
// discovered one at a time.
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-20 border-b border-border bg-accent-soft px-5 py-2 text-center text-xs"
    >
      Offline — downloaded books still play.
    </div>
  );
}
