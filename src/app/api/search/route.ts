import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client.ts";
import { badRequest } from "@/lib/api";
import { bookSummarySelect, toBookSummary } from "@/lib/book-summary";
import { db } from "@/lib/db";
import { durationRange, hasActiveFilters, readFilters } from "@/lib/search-filters";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 40;

// GET /api/search?q=…&language=…&category=…&duration=…
//
// The text term matches title, author, narrator or category; the filters narrow
// whatever that returns. A blank term with filters set is a valid search — it
// means "everything in this category", which is how you browse rather than look
// something up.
//
// `mode: "insensitive"` is required: Postgres LIKE is case-sensitive, so
// without it "twain" would not find "Mark Twain". SQLite folded ASCII case on
// its own, which hid this until the move to Postgres.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const filters = readFilters(params);

  if (query.length > 100) return badRequest("query too long");

  // Nothing to search on at all: an empty term with no filters would otherwise
  // return the first 40 books for no reason.
  if (query.length === 0 && !hasActiveFilters(filters)) {
    return NextResponse.json({ books: [], took: 0 });
  }

  const startedAt = performance.now();

  const where: Prisma.BookWhereInput = {};

  if (query !== "") {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { author: { contains: query, mode: "insensitive" } },
      { narrator: { contains: query, mode: "insensitive" } },
      { category: { contains: query, mode: "insensitive" } },
    ];
  }

  if (filters.language !== "") {
    where.language = { equals: filters.language, mode: "insensitive" };
  }

  if (filters.category !== "") {
    where.category = { equals: filters.category, mode: "insensitive" };
  }

  const range = durationRange(filters.duration);
  if (range) {
    // Half-open on purpose, so the buckets tile the range without a book that
    // is exactly one hour long falling into two of them.
    where.totalDuration = {
      gte: range.min,
      ...(range.max === null ? {} : { lt: range.max }),
    };
  }

  const books = await db.book.findMany({
    where,
    orderBy: { title: "asc" },
    take: MAX_RESULTS,
    select: bookSummarySelect,
  });

  return NextResponse.json({
    books: books.map(toBookSummary),
    took: Math.round(performance.now() - startedAt),
  });
}
