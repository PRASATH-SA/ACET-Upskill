/**
 * Generates the PWA icons (F7) without image tooling: a navy tile with a small concept map
 * (three linked nodes in the A.8 colours). Writes PNGs with Node's zlib.
 *
 *   node scripts/make-icons.js
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/public/icons');
mkdirSync(out, { recursive: true });

const NAVY = [15, 45, 92];
const GOLD = [245, 192, 0];
const BLUE = [47, 107, 234];
const WHITE = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const distToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/**
 * @param {number} size
 * @param {{ maskable?: boolean }} opts  maskable icons keep the art inside the 80% safe zone
 *   and fill the whole square; normal icons get rounded corners.
 */
function icon(size, { maskable = false } = {}) {
  const s = size / 100;
  const scale = maskable ? 0.72 : 1; // shrink the art into the maskable safe zone
  const c = (v) => 50 + (v - 50) * scale; // map 0–100 art coords around the centre
  const nodes = [
    { x: c(28), y: c(64), r: 11 * scale, color: GOLD },
    { x: c(50), y: c(34), r: 11 * scale, color: BLUE, ring: true },
    { x: c(74), y: c(62), r: 11 * scale, color: WHITE },
  ];
  const edges = [
    [nodes[0], nodes[1]],
    [nodes[1], nodes[2]],
  ];
  const corner = maskable ? 0 : 22;
  return png(size, (x, y) => {
    const u = x / s;
    const v = y / s;
    // Rounded-square mask for the normal icon.
    if (corner) {
      const cx = Math.min(Math.max(u, corner), 100 - corner);
      const cy = Math.min(Math.max(v, corner), 100 - corner);
      if (Math.hypot(u - cx, v - cy) > corner) return [0, 0, 0, 0];
    }
    for (const n of nodes) {
      const d = Math.hypot(u - n.x, v - n.y);
      if (d <= n.r) return [...n.color, 255];
      if (n.ring && d <= n.r + 3.5 * scale) return [...WHITE, 255];
    }
    for (const [a, b] of edges) {
      if (distToSegment(u, v, a.x, a.y, b.x, b.y) <= 2.6 * scale) return [...WHITE, 255];
    }
    return [...NAVY, 255];
  });
}

const files = {
  'icon-192.png': icon(192),
  'icon-512.png': icon(512),
  'maskable-512.png': icon(512, { maskable: true }),
  'apple-touch-icon.png': icon(180, { maskable: true }),
  'favicon-32.png': icon(32),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(path.join(out, name), buf);
  process.stdout.write(`wrote icons/${name} (${buf.length} bytes)\n`);
}
