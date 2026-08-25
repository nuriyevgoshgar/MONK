import { AppShell } from "@/components/app-shell";
import { SearchView } from "@/components/search/search-view";
import { readSearchFacets } from "@/lib/facets";

// The filter options come from the catalogue, so this page reads the database
// once on the server rather than the client making a second round trip for a
// list that barely changes.
export default async function SearchPage() {
  const facets = await readSearchFacets();

  return (
    <AppShell>
      <h1 className="mb-4 font-serif text-2xl">Search</h1>
      <SearchView facets={facets} />
    </AppShell>
  );
}
