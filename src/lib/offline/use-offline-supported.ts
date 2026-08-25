"use client";

import { useSyncExternalStore } from "react";
import { offlineSupported } from "./downloads";

// Whether this browser can store downloads. Read through useSyncExternalStore
// for the same reason as the device id: the answer needs `window`, and the
// server must render the "not supported" branch without a hydration mismatch.
const subscribe = () => () => {};
const getServerSnapshot = () => false;

export function useOfflineSupported(): boolean {
  return useSyncExternalStore(subscribe, offlineSupported, getServerSnapshot);
}
