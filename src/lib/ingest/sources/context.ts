import type { PoliteClient } from "../http.ts";
import type { RobotsRules } from "../robots.ts";
import type { SourceBook } from "./types.ts";

/** Everything a source needs, so sources stay free of CLI and database detail. */
export type SourceContext = {
  client: PoliteClient;
  robots: RobotsRules;
  /** Stop after this many candidate books have been handed over. */
  limit: number;
  log: (message: string) => void;
  onSkip: (url: string, reason: string, title?: string) => Promise<void>;
  onBroken: (url: string, reason: string) => Promise<void>;
};

/** Books are streamed to the handler rather than collected, so a catalogue of
 *  any size stays flat in memory. */
export type BookHandler = (book: SourceBook) => Promise<void>;
