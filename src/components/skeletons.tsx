// Shared loading placeholders. They mirror the real components' dimensions so
// the layout does not jump when content arrives.

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-raised ${className}`}
      aria-hidden="true"
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
      <Skeleton className="h-22 w-22 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export function BookListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <BookCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
