"use client";

import { useSyncExternalStore } from "react";
import { getDeviceId } from "./device-id";

// The device id never changes once read, so there is nothing to subscribe to.
const subscribe = () => () => {};
const getServerSnapshot = () => null;

// Read through useSyncExternalStore rather than an effect: localStorage is not
// available while rendering on the server, and this keeps the server and
// client markup identical.
export function useDeviceId(): string | null {
  return useSyncExternalStore(subscribe, getDeviceId, getServerSnapshot);
}
