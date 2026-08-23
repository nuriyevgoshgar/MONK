import { AppShell } from "@/components/app-shell";
import { BookListSkeleton, Skeleton } from "@/components/skeletons";

export default function LibraryLoading() {
  return (
    <AppShell>
      <h1 className="mb-4 font-serif text-2xl">Library</h1>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="mt-4">
        <BookListSkeleton count={3} />
      </div>
    </AppShell>
  );
}
