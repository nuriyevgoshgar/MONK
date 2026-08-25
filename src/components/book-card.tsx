import Image from "next/image";
import Link from "next/link";
import type { BookSummary } from "@/lib/book-summary";
import { formatDuration } from "@/lib/format";

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link
      href={`/book/${book.slug}`}
      className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
    >
      <Image
        src={book.coverUrl}
        alt=""
        width={88}
        height={88}
        // The optimizer refuses SVG by design. Our placeholder covers are
        // local SVGs we authored, so they skip it; real (raster) covers from
        // ingestion still go through it.
        unoptimized={book.coverUrl.endsWith(".svg")}
        className="h-22 w-22 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-xl leading-tight">{book.title}</h3>
        <p className="mt-0.5 text-sm text-muted">{book.author}</p>
        <p className="mt-2 text-xs text-muted">Narrated by {book.narrator}</p>
        <p className="mt-1 text-xs text-muted">
          {book.category} · {book.chapterCount} chapters ·{" "}
          {formatDuration(book.totalDuration)}
        </p>
      </div>
    </Link>
  );
}
