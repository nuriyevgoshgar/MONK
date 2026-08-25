import { NextResponse } from "next/server";
import { badRequest, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { isShelfStatus } from "@/lib/shelf";

export const dynamic = "force-dynamic";

// GET /api/shelf?userId=…[&bookId=…]
// Without a bookId this returns the whole shelf, which is what Library renders.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  const bookId = params.get("bookId");

  if (!userId) return badRequest("userId is required");

  const entries = await db.shelf.findMany({
    where: bookId ? { userId, bookId } : { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      book: {
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
      },
    },
  });

  return NextResponse.json({
    entries: entries.map((entry) => ({
      status: entry.status,
      book: { ...entry.book, chapterCount: entry.book._count.chapters },
    })),
  });
}

type ShelfBody = { userId?: string; bookId?: string; status?: string };

// POST /api/shelf — put a book on a shelf, or move it between shelves.
export async function POST(request: Request) {
  const body = await readJson<ShelfBody>(request);

  if (!body) return badRequest("invalid JSON body");

  const { userId, bookId, status } = body;

  if (!userId || !bookId) return badRequest("userId and bookId are required");
  if (!status || !isShelfStatus(status)) return badRequest("unknown shelf status");

  await db.shelf.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, status },
    update: { status },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/shelf?userId=…&bookId=… — take it off the shelf entirely.
export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  const bookId = params.get("bookId");

  if (!userId || !bookId) return badRequest("userId and bookId are required");

  await db.shelf.deleteMany({ where: { userId, bookId } });

  return NextResponse.json({ ok: true });
}
