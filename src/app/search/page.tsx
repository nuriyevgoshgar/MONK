import { AppShell } from "@/components/app-shell";
import { SearchView } from "@/components/search/search-view";

export default function SearchPage() {
  return (
    <AppShell>
      <h1 className="mb-4 font-serif text-2xl">Search</h1>
      <SearchView />
    </AppShell>
  );
}
