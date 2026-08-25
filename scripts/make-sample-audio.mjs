// Generates the placeholder narration audio the development seed points at.
//
// The seed's chapter durations are the source of truth: every file produced
// here is exactly as long as prisma/seed-data/books.json says it is, so the
// scrub bar, sleep timer and progress saving can be tested against real
// timings. Each chapter opens with N short beeps (N = chapter number) so you
// can hear when auto-advance moves to the next one.
//
// Output is gitignored — run `npm run sample:audio` after cloning.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SAMPLE_RATE = 8000;
const BYTES_PER_SAMPLE = 2;
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "samples");
const SEED_FILE = path.join(ROOT, "prisma", "seed-data", "books.json");

function wavHeader(dataBytes) {
  const header = Buffer.alloc(44);
  const byteRate = SAMPLE_RATE * BYTES_PER_SAMPLE;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format: PCM
  header.writeUInt16LE(1, 22); // channels: mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);

  return header;
}

// Amplitude envelope: N opening beeps, then a steady tone that fades out.
function amplitudeAt(seconds, duration, beeps) {
  const beepWindow = beeps * 0.4;

  if (seconds < beepWindow) {
    const withinBeep = seconds % 0.4;
    return withinBeep < 0.2 ? 0.28 : 0;
  }

  const fadeIn = Math.min(1, (seconds - beepWindow) / 0.5);
  const fadeOut = Math.min(1, (duration - seconds) / 1.5);

  return 0.14 * fadeIn * Math.max(0, fadeOut);
}

function renderChapter({ duration, index }) {
  const beeps = index + 1;
  const toneHz = 180 + index * 40;
  const beepHz = 880;
  const sampleCount = duration * SAMPLE_RATE;
  const data = Buffer.alloc(sampleCount * BYTES_PER_SAMPLE);

  for (let i = 0; i < sampleCount; i += 1) {
    const seconds = i / SAMPLE_RATE;
    const amplitude = amplitudeAt(seconds, duration, beeps);
    const hz = seconds < beeps * 0.4 ? beepHz : toneHz;
    const value = Math.sin(2 * Math.PI * hz * seconds) * amplitude;

    data.writeInt16LE(Math.round(value * 32767), i * BYTES_PER_SAMPLE);
  }

  return Buffer.concat([wavHeader(data.length), data]);
}

async function main() {
  const seed = JSON.parse(await readFile(SEED_FILE, "utf8"));
  let files = 0;
  let bytes = 0;

  for (const book of seed.books) {
    const bookDir = path.join(OUT_DIR, book.slug);
    await mkdir(bookDir, { recursive: true });

    for (const [index, chapter] of book.chapters.entries()) {
      const wav = renderChapter({ duration: chapter.duration, index });
      await writeFile(path.join(bookDir, `${index + 1}.wav`), wav);
      files += 1;
      bytes += wav.length;
    }

    console.log(`  ${book.slug}: ${book.chapters.length} chapters`);
  }

  console.log(
    `\nWrote ${files} files (${(bytes / 1024 / 1024).toFixed(1)} MB) to public/samples`,
  );
}

await main();
