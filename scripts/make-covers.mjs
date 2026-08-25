// Draws the placeholder cover art the development seed points at.
//
// These stand in until the ingestion step brings real covers. They are built to
// read at card size (88px) rather than to look like book jackets: the title's
// initials, an accent rule, the wordmark.
//
//   npm run covers

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "covers");
const SEED_FILE = path.join(ROOT, "prisma", "seed-data", "books.json");

// Words that carry no identity in a title, so "Pride and Prejudice" -> "PP".
const SKIP_WORDS = new Set(["the", "a", "an", "and", "of", "in", "on", "to"]);

function initialsFor(title) {
  const words = title
    .split(/\s+/)
    // Drop possessives so "Alice's" contributes one letter, not two.
    .map((word) => word.replace(/['’]s\b/gi, "").replace(/[^\p{L}]/gu, ""))
    .filter((word) => word && !SKIP_WORDS.has(word.toLowerCase()));

  if (words.length === 0) return title.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[1][0]).toUpperCase();
}

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function coverSvg({ title, author, initials }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${escape(title)} by ${escape(author)}">
  <rect width="600" height="600" fill="#17150F"/>
  <rect x="0" y="0" width="14" height="600" fill="#C88A4A"/>
  <text x="300" y="330" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="260" fill="#EDE7DF">${escape(initials)}</text>
  <line x1="230" y1="400" x2="370" y2="400" stroke="#C88A4A" stroke-width="10"/>
  <text x="300" y="500" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="46" letter-spacing="14" fill="#6E655C">MONK</text>
</svg>
`;
}

const seed = JSON.parse(readFileSync(SEED_FILE, "utf8"));
mkdirSync(OUT_DIR, { recursive: true });

for (const book of seed.books) {
  const initials = initialsFor(book.title);
  writeFileSync(
    path.join(OUT_DIR, `${book.slug}.svg`),
    coverSvg({ title: book.title, author: book.author, initials }),
  );
  console.log(`  ${book.slug} -> ${initials}`);
}

console.log(`\nWrote ${seed.books.length} covers to public/covers`);
