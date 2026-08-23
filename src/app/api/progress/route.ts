import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { playerBookSelect } from "@/lib/player/book-query";
import type { SavedProgress } from "@/lib/player/types";

// Progress is keyed by the listener's device id (see src/lib/device-id.ts),
// which only exists in the browser — so the player reads and writes it here
// rather than through a server component.

export const dynamic = "force-dynamic";

// GET /api/progress?userId=…            -> most recent book, for resuming
// GET /api/progress?userId=…&bookId=…   -> where the listener is in one book
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  const bookId = params.get("bookId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const progress = await db.progress.findFirst({
    where: bookId ? { userId, bookId } : { userId },
    orderBy: { updatedAt: "desc" },
    include: { book: { select: playerBookSelect } },
  });

  if (!progress) return NextResponse.json({ progress: null });

  const chapterIndex = progress.book.chapters.findIndex(
    (chapter) => chapter.id === progress.chapterId,
  );

  const payload: SavedProgress = {
    book: progress.book,
    // A chapter can disappear if the catalogue was re-seeded; start over
    // rather than resuming into nothing.
    chapterIndex: chapterIndex === -1 ? 0 : chapterIndex,
    positionSec: chapterIndex === -1 ? 0 : progress.positionSec,
    finished: progress.finished,
  };

  return NextResponse.json({ progress: payload });
}

type SaveBody = {
  userId?: string;
  bookId?: string;
  chapterId?: string;
  positionSec?: number;
  finished?: boolean;
};

// POST /api/progress — one row per listener per book, so this always upserts.
// Called on a timer while playing, on pause and chapter change, and via
// sendBeacon when the tab goes away.
export async function POST(request: Request) {
  let body: SaveBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { userId, bookId, chapterId } = body;

  if (!userId || !bookId || !chapterId) {
    return NextResponse.json(
      { error: "userId, bookId and chapterId are required" },
      { status: 400 },
    );
  }

  const positionSec = Math.max(0, Math.floor(body.positionSec ?? 0));
  const finished = body.finished ?? false;

  // Reject ids that do not belong together, so a stale tab cannot write a
  // chapter onto the wrong book.
  const chapter = await db.chapter.findFirst({
    where: { id: chapterId, bookId },
    select: { id: true },
  });

  if (!chapter) {
    return NextResponse.json(
      { error: "chapter does not belong to book" },
      { status: 400 },
    );
  }

  const status = finished ? "done" : "listening";

  // Listening to a book is what puts it on the Listening shelf, and finishing
  // it moves it to Finished — the listener never has to file anything by hand.
  await db.$transaction([
    db.progress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, chapterId, positionSec, finished },
      update: { chapterId, positionSec, finished },
    }),
    db.shelf.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, status },
      update: { status },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
