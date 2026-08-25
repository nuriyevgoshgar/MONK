// The slice of a book the player needs. Pages pass this down from the server
// so the player never has to fetch a book it is already showing.
export type PlayerChapter = {
  id: string;
  index: number;
  title: string;
  audioUrl: string;
  duration: number;
};

export type PlayerBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  narrator: string;
  coverUrl: string;
  chapters: PlayerChapter[];
};

export type SavedProgress = {
  book: PlayerBook;
  chapterIndex: number;
  positionSec: number;
  finished: boolean;
};

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const;

export const SKIP_BACK_SEC = 15;
export const SKIP_FORWARD_SEC = 30;

// How often the position is written back while playing.
export const SAVE_INTERVAL_MS = 5000;
