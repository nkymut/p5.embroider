import { describe, expect, test } from "@jest/globals";
import { DSTWriter } from "../src/io/p5-tajima-dst-writer.js";

// Decode 3-byte records into absolute 0.1 mm positions from the needle start (0,0).
function decode(bytes) {
  let x = 0, y = 0, minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (let i = 512; i + 2 < bytes.length; i += 3) {
    const [b0, b1, b2] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    if (b2 === 0xf3) break;
    x += (b0 & 1 ? 1 : 0) - (b0 & 2 ? 1 : 0) + (b0 & 4 ? 9 : 0) - (b0 & 8 ? 9 : 0)
      + (b1 & 1 ? 3 : 0) - (b1 & 2 ? 3 : 0) + (b1 & 4 ? 27 : 0) - (b1 & 8 ? 27 : 0)
      + (b2 & 4 ? 81 : 0) - (b2 & 8 ? 81 : 0);
    y += (b0 & 128 ? 1 : 0) - (b0 & 64 ? 1 : 0) + (b0 & 32 ? 9 : 0) - (b0 & 16 ? 9 : 0)
      + (b1 & 128 ? 3 : 0) - (b1 & 64 ? 3 : 0) + (b1 & 32 ? 27 : 0) - (b1 & 16 ? 27 : 0)
      + (b2 & 32 ? 81 : 0) - (b2 & 16 ? 81 : 0);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { width: maxX - minX, height: maxY - minY };
}

function header(bytes, key) {
  const text = String.fromCharCode(...bytes.slice(0, 512));
  const m = text.match(new RegExp(`\\${key}:\\s*(-?\\d+)`));
  return m ? Number(m[1]) : NaN;
}

// 20 × 20 mm square outline (DST units are 0.1 mm), a point every 2 mm.
function square(cx, cy) {
  const pts = [];
  const r = 100;
  const c = [[-r, -r], [r, -r], [r, r], [-r, r], [-r, -r]];
  for (let k = 0; k < 4; k++) {
    for (let s = 0; s < 10; s++) {
      pts.push({ x: cx + c[k][0] + ((c[k + 1][0] - c[k][0]) * s) / 10, y: cy + c[k][1] + ((c[k + 1][1] - c[k][1]) * s) / 10 });
    }
  }
  pts.push({ x: cx - r, y: cy - r });
  return pts;
}

describe("DSTWriter centring", () => {
  test("a design around the origin keeps its size and a symmetric header", () => {
    const bytes = new DSTWriter().generateDST(square(0, 0), "T");
    expect(decode(bytes)).toEqual({ width: 200, height: 200 });
    for (const k of ["+X", "-X", "+Y", "-Y"]) expect(header(bytes, k)).toBe(100);
  });

  test("the same design far from the origin gives identical records", () => {
    const a = new DSTWriter().generateDST(square(0, 0), "T");
    const b = new DSTWriter().generateDST(square(9000, 4000), "T");
    expect(Array.from(a.slice(512))).toEqual(Array.from(b.slice(512)));
  });

  test("negative-only coordinates are centred too", () => {
    const bytes = new DSTWriter().generateDST(square(-5000, -3000), "T");
    expect(decode(bytes)).toEqual({ width: 200, height: 200 });
    expect(header(bytes, "+X")).toBe(100);
    expect(header(bytes, "-X")).toBe(100);
  });
});
