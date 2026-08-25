// Generates the PWA icons. Written by hand with node:zlib so the project does
// not need an image library for five static files.
//
//   npm run icons

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(path.resolve(import.meta.dirname, ".."), "public", "icons");

const BACKGROUND = [0x10, 0x10, 0x10];
const ACCENT = [0xff, 0xff, 0xff];

// The MONK "M", as four thick strokes in a unit box.
const STROKES = [
  [0.22, 0.78, 0.22, 0.22],
  [0.22, 0.22, 0.5, 0.6],
  [0.5, 0.6, 0.78, 0.22],
  [0.78, 0.22, 0.78, 0.78],
];

function distanceToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));

  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Supersampled coverage, so the diagonals do not come out jagged.
function coverageAt(u, v, size, halfWidth) {
  const samples = 3;
  let hits = 0;

  for (let sy = 0; sy < samples; sy += 1) {
    for (let sx = 0; sx < samples; sx += 1) {
      const px = u + (sx + 0.5) / samples / size;
      const py = v + (sy + 0.5) / samples / size;

      if (STROKES.some((s) => distanceToSegment(px, py, s) <= halfWidth)) hits += 1;
    }
  }

  return hits / (samples * samples);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  // 10-12: compression, filter and interlace methods all default to 0.

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// `padding` shrinks the mark for maskable icons, whose corners get cropped.
function drawIcon(size, { padding = 0 } = {}) {
  const stride = size * 3 + 1; // one filter byte per scanline
  const raw = Buffer.alloc(stride * size);
  const scale = 1 - padding * 2;
  const halfWidth = 0.055 * scale;

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none

    for (let x = 0; x < size; x += 1) {
      const u = (x / size - padding) / scale;
      const v = (y / size - padding) / scale;
      const alpha = coverageAt(u, v, size * scale, halfWidth);
      const offset = rowStart + 1 + x * 3;

      for (let channel = 0; channel < 3; channel += 1) {
        raw[offset + channel] = Math.round(
          BACKGROUND[channel] * (1 - alpha) + ACCENT[channel] * alpha,
        );
      }
    }
  }

  return encodePng(size, raw);
}

mkdirSync(OUT_DIR, { recursive: true });

const icons = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { padding: 0.1 }],
  ["apple-touch-icon.png", 180, { padding: 0.06 }],
];

for (const [name, size, options] of icons) {
  const png = drawIcon(size, options);
  writeFileSync(path.join(OUT_DIR, name), png);
  console.log(`  ${name}  ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

console.log(`\nWrote ${icons.length} icons to public/icons`);
