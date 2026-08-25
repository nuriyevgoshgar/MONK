import type { ExtractedChapter } from "../extract.ts";

/** What every source hands back, whatever shape its upstream data has. */
export type SourceBook = {
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  description: string;
  category: string;
  language: string;
  totalDuration: number;
  sourceUrl: string;
  /** Raw licence text; the licence gate decides whether it may be ingested. */
  licenseText: string | undefined;
  chapters: ExtractedChapter[];
};
