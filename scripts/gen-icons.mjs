// Gera icon-192.png e icon-512.png (quadrado escuro arredondado + check verde)
// sem dependências externas, usando zlib para montar o PNG.
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [15, 23, 42]; // #0f172a
const FG = [34, 197, 94]; // #22c55e

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const s = size;
  const radius = s * 0.22;
  const strokeW = s * 0.085;
  // check points (relative to 64 viewbox: M20 33 L28 41 L44 23)
  const p1 = [20 / 64 * s, 33 / 64 * s];
  const p2 = [28 / 64 * s, 41 / 64 * s];
  const p3 = [44 / 64 * s, 23 / 64 * s];

  const raw = Buffer.alloc((s * 4 + 1) * s);
  let o = 0;
  for (let y = 0; y < s; y++) {
    raw[o++] = 0; // filter byte
    for (let x = 0; x < s; x++) {
      // rounded-corner alpha
      let inside = true;
      const cx = Math.min(x, s - 1 - x);
      const cy = Math.min(y, s - 1 - y);
      if (cx < radius && cy < radius) {
        const dx = radius - cx, dy = radius - cy;
        if (Math.hypot(dx, dy) > radius) inside = false;
      }
      let r = BG[0], g = BG[1], b = BG[2], a = inside ? 255 : 0;
      if (inside) {
        const d = Math.min(
          distToSeg(x, y, p1[0], p1[1], p2[0], p2[1]),
          distToSeg(x, y, p2[0], p2[1], p3[0], p3[1]),
        );
        if (d < strokeW / 2) {
          r = FG[0]; g = FG[1]; b = FG[2];
        }
      }
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0);
  ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', makePng(192));
writeFileSync('public/icon-512.png', makePng(512));
console.log('Ícones gerados: public/icon-192.png, public/icon-512.png');
