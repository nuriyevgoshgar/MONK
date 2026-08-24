// Skipped and broken items go to a file rather than scrolling past in the
// terminal, so a long crawl leaves an auditable trail of what it refused and
// why. One JSON object per line, appended as the crawl runs.

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type ReportKind = "skipped" | "broken" | "ingested";

export type ReportEntry = {
  at: string;
  kind: ReportKind;
  url: string;
  title?: string;
  reason?: string;
};

export class IngestReport {
  private readonly file: string;
  private readonly counts: Record<ReportKind, number> = {
    skipped: 0,
    broken: 0,
    ingested: 0,
  };

  constructor(file: string) {
    this.file = file;
  }

  async start() {
    await mkdir(path.dirname(this.file), { recursive: true });
    // Fresh file per run; the previous run's log is not useful once re-crawled.
    await writeFile(this.file, "");
  }

  async record(kind: ReportKind, url: string, details: { title?: string; reason?: string } = {}) {
    this.counts[kind] += 1;

    const entry: ReportEntry = {
      at: new Date().toISOString(),
      kind,
      url,
      ...details,
    };

    await appendFile(this.file, JSON.stringify(entry) + "\n");
  }

  get summary() {
    return { ...this.counts, file: this.file };
  }
}
