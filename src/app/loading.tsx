import { AppShell } from "@/components/app-shell";
import { BookListSkeleton, Skeleton } from "@/components/skeletons";

export default function HomeLoading() {
  return (
    <AppShell>
      <Skeleton className="h-3 w-28" />
      <div className="mt-3 mb-8">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-3 w-20" />
      <div className="mt-3">
        <BookListSkeleton />
      </div>
    </AppShell>
  );
}
