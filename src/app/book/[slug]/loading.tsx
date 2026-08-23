import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/skeletons";

export default function BookLoading() {
  return (
    <AppShell back>
      <Skeleton className="mx-auto aspect-square w-full max-w-[240px] rounded-2xl" />

      <div className="mt-6 flex flex-col items-center gap-2">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-11 w-full rounded-2xl" />

      <div className="mt-8 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      <Skeleton className="mt-8 h-56 w-full rounded-2xl" />
    </AppShell>
  );
}
