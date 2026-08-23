import Image from "next/image";
import Link from "next/link";
import { formatDuration } from "@/lib/format";

type BookCardProps = {
  slug: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  category: string;
  totalDuration: number;
  chapterCount: number;
};

export function BookCard({
  slug,
  title,
  author,
  narrator,
  coverUrl,
  category,
  totalDuration,
  chapterCount,
}: BookCardProps) {
  return (
    <Link
      href={`/book/${slug}`}
      className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
    >
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
        <h3 className="font-serif text-xl leading-tight">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{author}</p>
        <p className="mt-2 text-xs text-muted">Narrated by {narrator}</p>
        <p className="mt-1 text-xs text-muted">
          {category} · {chapterCount} chapters · {formatDuration(totalDuration)}
        </p>
      </div>
    </Link>
  );
}
