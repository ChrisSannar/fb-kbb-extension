/**
 * Generate the toolbar icons (extension/icons/icon-{16,32,48,128}.png).
 * No image deps — hand-rolls a minimal RGBA PNG. Draws a white car silhouette
 * on a rounded, blue-gradient tile, anti-aliased via 4x4 supersampling so it
 * stays crisp down to 16px. Run once with `bun run icons`; the PNGs are committed.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "extension", "icons");

type RGBA = [number, number, number, number];

const BLUE_TOP: RGBA = [43, 123, 255, 255]; // tile gradient top
const BLUE_BOT: RGBA = [10, 94, 216, 255]; // tile gradient bottom (#0a5ed8-ish)
const WHITE: RGBA = [255, 255, 255, 255];
const WHEEL: RGBA = [9, 42, 102, 255]; // dark navy tyres
const CLEAR: RGBA = [0, 0, 0, 0];

/** Signed distance to a rounded rectangle (negative = inside), normalized space. */
function sdRoundRect(
  u: number, v: number, x0: number, y0: number, x1: number, y1: number, r: number,
): number {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2 - r;
  const hy = (y1 - y0) / 2 - r;
  const qx = Math.abs(u - cx) - hx;
  const qy = Math.abs(v - cy) - hy;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

const sdCircle = (u: number, v: number, cx: number, cy: number, rad: number): number =>
  Math.hypot(u - cx, v - cy) - rad;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const mix = (a: RGBA, b: RGBA, t: number): RGBA => [
  lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t),
];

/** Colour of the icon at a normalized point (0..1, y down). Back-to-front compositing. */
function colorAt(u: number, v: number): RGBA {
  if (sdRoundRect(u, v, 0, 0, 1, 1, 0.22) > 0) return CLEAR; // outside the rounded tile
  let c = mix(BLUE_TOP, BLUE_BOT, v); // tile gradient

  // Car body = lower body + cabin (union of two rounded rects).
  const body = Math.min(
    sdRoundRect(u, v, 0.13, 0.50, 0.87, 0.64, 0.05),
    sdRoundRect(u, v, 0.31, 0.36, 0.67, 0.51, 0.05),
  );
  if (body <= 0) c = WHITE;

  // Wheels sit under the body (navy) with a small white hub.
  if (sdCircle(u, v, 0.32, 0.645, 0.10) <= 0 || sdCircle(u, v, 0.68, 0.645, 0.10) <= 0) c = WHEEL;
  if (sdCircle(u, v, 0.32, 0.645, 0.038) <= 0 || sdCircle(u, v, 0.68, 0.645, 0.038) <= 0) c = WHITE;

  return c;
}

const SS = 4; // supersampling factor per axis

/** Average the icon colour over SS*SS subsamples (premultiplied) for clean edges. */
function pixel(x: number, y: number, size: number): RGBA {
  let pr = 0, pg = 0, pb = 0, pa = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const u = (x + (sx + 0.5) / SS) / size;
      const v = (y + (sy + 0.5) / SS) / size;
      const [r, g, b, a] = colorAt(u, v);
      const af = a / 255;
      pr += r * af; pg += g * af; pb += b * af; pa += af;
    }
  }
  const n = SS * SS;
  const cov = pa / n; // 0..1
  if (cov <= 0) return CLEAR;
  return [
    Math.round(pr / n / cov),
    Math.round(pg / n / cov),
    Math.round(pb / n / cov),
    Math.round(cov * 255),
  ];
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
      const [r, g, b, a] = pixel(x, y, size);
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
