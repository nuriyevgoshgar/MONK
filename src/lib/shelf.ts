// SQLite has no enum type, so Shelf.status is stored as text and validated here.
export const SHELF_STATUSES = ["saved", "listening", "done"] as const;

export type ShelfStatus = (typeof SHELF_STATUSES)[number];

export function isShelfStatus(value: string): value is ShelfStatus {
  return (SHELF_STATUSES as readonly string[]).includes(value);
}

export const SHELF_LABELS: Record<ShelfStatus, string> = {
  saved: "Saved",
  listening: "Listening",
  done: "Finished",
};
