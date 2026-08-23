// One definition of "the fields the player needs", shared by the pages that
// render a book and the API that restores one on reload.
export const playerBookSelect = {
  id: true,
  slug: true,
  title: true,
  author: true,
  narrator: true,
  coverUrl: true,
  chapters: {
    orderBy: { index: "asc" },
    select: {
      id: true,
      index: true,
      title: true,
      audioUrl: true,
      duration: true,
    },
  },
} as const;
