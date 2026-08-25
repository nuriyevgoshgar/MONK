// What a book looks like in a list — home, search results and the library all
// render the same shape.
export type BookSummary = {
  id: string;
  slug: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  category: string;
  totalDuration: number;
  chapterCount: number;
};

// Prisma selection matching BookSummary, minus the chapter count which comes
// back nested under `_count`.
export const bookSummarySelect = {
  id: true,
  slug: true,
  title: true,
  author: true,
  narrator: true,
  coverUrl: true,
  category: true,
  totalDuration: true,
  _count: { select: { chapters: true } },
} as const;

export function toBookSummary<T extends { _count: { chapters: number } }>(
  row: T,
): Omit<T, "_count"> & { chapterCount: number } {
  const { _count, ...rest } = row;
  return { ...rest, chapterCount: _count.chapters };
}
