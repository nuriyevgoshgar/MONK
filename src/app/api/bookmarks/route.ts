import { NextResponse } from "next/server";
import { badRequest, readJson } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_NOTE_LENGTH = 280;

// GET /api/bookmarks?userId=…[&bookId=…]
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  const bookId = params.get("bookId");

  if (!userId) return badRequest("userId is required");

  const bookmarks = await db.bookmark.findMany({
    where: bookId ? { userId, bookId } : { userId },
    orderBy: { createdAt: "desc" },
    include: {
      chapter: { select: { index: true, title: true } },
      book: { select: { slug: true, title: true } },
    },
  });

  return NextResponse.json({ bookmarks });
}

type BookmarkBody = {
  userId?: string;
  bookId?: string;
  chapterId?: string;
  positionSec?: number;
  note?: string;
};

// POST /api/bookmarks — drop a marker at the current position.
export async function POST(request: Request) {
  const body = await readJson<BookmarkBody>(request);

  if (!body) return badRequest("invalid JSON body");

  const { userId, bookId, chapterId } = body;

  if (!userId || !bookId || !chapterId) {
    return badRequest("userId, bookId and chapterId are required");
  }

  const chapter = await db.chapter.findFirst({
    where: { id: chapterId, bookId },
    select: { id: true },
  });

  if (!chapter) return badRequest("chapter does not belong to book");

  const bookmark = await db.bookmark.create({
    data: {
      userId,
      bookId,
      chapterId,
      positionSec: Math.max(0, Math.floor(body.positionSec ?? 0)),
      note: body.note?.slice(0, MAX_NOTE_LENGTH) || null,
    },
  });

  return NextResponse.json({ bookmark });
}

// DELETE /api/bookmarks?userId=…&id=…
export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  const id = params.get("id");

  if (!userId || !id) return badRequest("userId and id are required");

  // Scoped by userId so an id alone cannot delete someone else's bookmark.
  await db.bookmark.deleteMany({ where: { id, userId } });

  return NextResponse.json({ ok: true });
}
