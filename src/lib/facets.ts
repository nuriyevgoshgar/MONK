import { db } from "@/lib/db";

// The values a filter can actually take, read from the catalogue rather than
// hard-coded: an ingestion run adds categories nobody listed here, and a filter
// offering a category with no books behind it is worse than no filter at all.
export type SearchFacets = {
  languages: string[];
  categories: string[];
};

export async function readSearchFacets(): Promise<SearchFacets> {
  const [languages, categories] = await Promise.all([
    db.book.findMany({
      distinct: ["language"],
      select: { language: true },
      orderBy: { language: "asc" },
    }),
    db.book.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  return {
    languages: languages.map((row) => row.language).filter(Boolean),
    categories: categories.map((row) => row.category).filter(Boolean),
  };
}
