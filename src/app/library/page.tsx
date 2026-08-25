import { AppShell } from "@/components/app-shell";
import { LibraryView } from "@/components/library/library-view";

export default function LibraryPage() {
  return (
    <AppShell>
      <h1 className="mb-4 font-serif text-2xl">Library</h1>
      <LibraryView />
    </AppShell>
  );
}
