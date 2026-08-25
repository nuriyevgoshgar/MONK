// Until real auth exists, a listener is identified by a random id kept in
// localStorage. The Progress/Bookmark/Shelf tables already store this as a
// plain `userId` string, so swapping in a real account id later is a change
// here and nowhere else.
const STORAGE_KEY = "monk.device-id";

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;

  // Server render, or a browser with storage blocked: fall back to a
  // throwaway id so nothing crashes; progress just will not persist.
  if (typeof window === "undefined") return "server";

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);

    if (existing) {
      cached = existing;
      return existing;
    }

    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    cached = created;
    return created;
  } catch {
    cached = crypto.randomUUID();
    return cached;
  }
}
