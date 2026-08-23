import Image from "next/image";
import { formatDuration } from "@/lib/format";

type BookCardProps = {
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  category: string;
  totalDuration: number;
  chapterCount: number;
  sourceUrl: string;
  license: string;
};

// Attribution is part of the card, not an afterthought: every title shows who
// narrated it, where it came from and under what licence.
export function BookCard({
  title,
  author,
  narrator,
  coverUrl,
  category,
  totalDuration,
  chapterCount,
  sourceUrl,
  license,
}: BookCardProps) {
  return (
    <article className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
      <Image
        src={coverUrl}
        alt=""
        width={88}
        height={88}
        // The optimizer refuses SVG by design. Our placeholder covers are
        // local SVGs we authored, so they skip it; real (raster) covers from
        // ingestion still go through it.
        unoptimized={coverUrl.endsWith(".svg")}
        className="h-22 w-22 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-xl leading-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{author}</p>
        <p className="mt-2 text-xs text-muted">
          Narrated by {narrator}
        </p>
        <p className="mt-1 text-xs text-muted">
          {category} · {chapterCount} chapters · {formatDuration(totalDuration)}
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {license}{" "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            Source
          </a>
        </p>
      </div>
    </article>
  );
}
