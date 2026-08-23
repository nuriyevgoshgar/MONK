import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 40;

// GET /api/search?q=… — title, author, narrator or category.
// SQLite's LIKE is already case-insensitive for ASCII, which is why there is
// no `mode: "insensitive"` here (Prisma does not support it on SQLite).
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length > 100) return badRequest("query too long");

  if (query.length === 0) {
    return NextResponse.json({ books: [], took: 0 });
  }

  const startedAt = performance.now();

  const books = await db.book.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        { author: { contains: query } },
        { narrator: { contains: query } },
        { category: { contains: query } },
      ],
    },
    orderBy: { title: "asc" },
    take: MAX_RESULTS,
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      narrator: true,
      coverUrl: true,
      category: true,
      totalDuration: true,
      _count: { select: { chapters: true } },
    },
  });

  return NextResponse.json({
    books: books.map(({ _count, ...book }) => ({
      ...book,
      chapterCount: _count.chapters,
    })),
    took: Math.round(performance.now() - startedAt),
  });
}
