/**
 * Generate the toolbar icons (extension/icons/icon-{16,32,48,128}.png).
 * No image deps — hand-rolls a minimal RGBA PNG. Solid KBB-blue tile with a
 * white "K". Run once with `bun run icons`; the PNGs are committed.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "extension", "icons");

const BLUE = [11, 110, 253, 255] as const; // #0b6efd
const WHITE = [255, 255, 255, 255] as const;

// 5x7 bitmap of the letter "K", scaled to fill the tile.
const K = [
  "1...1",
  "1..1.",
  "1.1..",
  "11...",
  "1.1..",
  "1..1.",
  "1...1",
];

function glyphOn(x: number, y: number, size: number): boolean {
  const pad = Math.round(size * 0.22);
  const inner = size - pad * 2;
  const col = Math.floor(((x - pad) / inner) * 5);
  const row = Math.floor(((y - pad) / inner) * 7);
  if (col < 0 || col > 4 || row < 0 || row > 6) return false;
  return K[row]![col] === "1";
}

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const len = data.length;
  const out = new Uint8Array(8 + body.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, len);
  out.set(body, 4);
  dv.setUint32(4 + body.length, crc32(body));
  return out;
}

function png(size: number): Uint8Array {
  // Raw image: 1 filter byte + RGBA per row.
  const raw = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = glyphOn(x, y, size) ? WHITE : BLUE;
      const p = rowStart + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
    }
  }

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0

  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(OUT, `icon-${size}.png`), png(size));
  console.log(`icons/icon-${size}.png`);
}
