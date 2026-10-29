import { describe, expect, test } from "@jest/globals";
import { PESWriter } from "../src/io/p5-pes-writer.js";

// Decode a truncated version 1 PES (#PES0001 + PEC). Returns the header fields, the stitch stream
// as absolute 0.1 mm positions from the origin, and the thumbnails as 48 × 38 bit arrays.
function decode(bytes) {
  const pec = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);
  const colorCount = bytes[pec + 48] + 1;
  const palette = Array.from(bytes.slice(pec + 49, pec + 49 + colorCount));
  const block = pec + 512;
  const blockLength = bytes[block + 2] | (bytes[block + 3] << 8) | (bytes[block + 4] << 16);
  const u16 = (i) => bytes[i] | (bytes[i + 1] << 8);
  const width = u16(block + 8);
  const height = u16(block + 10);

  const records = [];
  let x = 0,
    y = 0;
  let i = block + 16;
  const value = () => {
    const b = bytes[i++];
    if (b & 0x80) {
      const v = ((b << 8) | bytes[i++]) & 0x0fff;
      return { v: v > 0x7ff ? v - 0x1000 : v, flag: b & 0x30, long: true };
    }
    return { v: b > 63 ? b - 128 : b, flag: 0, long: false };
  };
  while (i < block + blockLength) {
    if (bytes[i] === 0xff) break;
    if (bytes[i] === 0xfe && bytes[i + 1] === 0xb0) {
      records.push({ type: "color", x, y });
      i += 3;
      continue;
    }
    const dx = value();
    const dy = value();
    x += dx.v;
    y += dy.v;
    const flag = dx.flag | dy.flag;
    records.push({ type: flag & 0x20 ? "trim" : flag & 0x10 ? "jump" : "stitch", x, y, dx: dx.v, dy: dy.v });
  }

  const graphics = [];
  for (let g = block + blockLength; g + 228 <= bytes.length; g += 228) {
    const bits = [];
    for (let row = 0; row < 38; row++) {
      for (let col = 0; col < 48; col++) bits.push((bytes[g + row * 6 + (col >> 3)] >> (col & 7)) & 1);
    }
    graphics.push(bits);
  }
  return { palette, width, height, records, graphics, end: bytes[i] };
}

// Square outline (0.1 mm units), side 2r, a point every r / 5, ending on its start corner.
function square(cx, cy, color, r = 100) {
  const pts = [];
  const c = [
    [-r, -r],
    [r, -r],
    [r, r],
    [-r, r],
    [-r, -r],
  ];
  for (let k = 0; k < 4; k++) {
    for (let s = 0; s < 10; s++) {
      pts.push({
        x: cx + c[k][0] + ((c[k + 1][0] - c[k][0]) * s) / 10,
        y: cy + c[k][1] + ((c[k + 1][1] - c[k][1]) * s) / 10,
        color,
      });
    }
  }
  pts.push({ x: cx - r, y: cy - r, color });
  return pts;
}

const RED = 0xff0000;
const BLUE = 0x0000ff;
const last = (a) => a[a.length - 1];
const write = (points) => decode(new PESWriter().generatePES(points, "test"));
// Inside the frame: rows 3..34, columns 3..44
const insideFrame = (bits) => bits.some((b, k) => b && k % 48 >= 3 && k % 48 <= 44 && k / 48 >= 3 && k / 48 <= 34);

describe("PES writer: jumps and trims", () => {
  test("travel marked as a jump is a trim-flagged jump, followed by a stitch at its destination", () => {
    const a = square(500, 500, RED);
    const b = square(1000, 500, RED);
    const { records } = write([...a, { ...last(a), jump: true }, ...b]);

    expect(records[0].type).toBe("jump"); // move from the origin
    const jumps = records.filter((r) => r.type === "trim");
    expect(jumps).toHaveLength(1);
    const k = records.indexOf(jumps[0]);
    expect(jumps[0].dx).toBe(500);
    expect(records[k + 1]).toMatchObject({ type: "stitch", dx: 0, dy: 0 });
    // No plain stitch covers the 50 mm travel
    expect(records.filter((r) => r.type === "stitch" && Math.abs(r.dx) > 100)).toHaveLength(0);
  });

  test("a trim cuts even when the next stitch is at the same place", () => {
    const a = square(500, 500, RED);
    const b = square(500, 500, RED);
    const { records } = write([...a, { ...last(a), trim: true, jump: true }, ...b]);
    const trims = records.filter((r) => r.type === "trim");
    expect(trims).toHaveLength(1);
    expect(trims[0]).toMatchObject({ dx: 0, dy: 0 });
  });

  test("the move after a colour change is a jump", () => {
    const a = square(500, 500, RED);
    const b = square(1000, 1000, BLUE);
    const { records, palette } = write([...a, ...b]);
    const k = records.findIndex((r) => r.type === "color");
    expect(k).toBeGreaterThan(0);
    expect(records[k + 1]).toMatchObject({ type: "trim", dx: 500, dy: 500 });
    expect(palette).toHaveLength(2);
  });

  test("two blocks of the same colour after a colour change get two palette entries", () => {
    const a = square(500, 500, RED);
    const b = square(1000, 500, BLUE);
    const c = square(1500, 500, RED);
    const { palette, records } = write([...a, ...b, ...c]);
    expect(palette).toHaveLength(3);
    expect(palette[0]).toBe(palette[2]);
    expect(records.filter((r) => r.type === "color")).toHaveLength(2);
  });

  test("moves over 204.7 mm are split into steps that fit 12 bits", () => {
    const a = square(0, 0, RED);
    const b = square(5000, 0, RED); // 500 mm away
    const { records, end } = write([...a, { ...last(a), jump: true }, ...b]);
    const steps = records.filter((r) => r.type === "trim");
    expect(steps.length).toBe(3);
    steps.forEach((r) => expect(Math.abs(r.dx)).toBeLessThanOrEqual(2047));
    expect(steps.reduce((s, r) => s + r.dx, 0)).toBe(5000);
    expect(last(records).x - records.find((r) => r.type === "stitch").x).toBe(5000); // a's start corner to b's
    expect(end).toBe(0xff);
  });

  test("a design wider than 409.4 mm keeps its first stitch in range", () => {
    const { records } = write([...square(0, 0, RED), ...square(4500, 0, RED)]); // 470 mm wide
    // Centred, the first stitch is 235 mm left of the origin: the move there takes two jumps
    expect(records.filter((r) => r.type === "jump")).toHaveLength(2);
    expect(records.find((r) => r.type === "stitch").x).toBe(-2350);
  });
});

describe("PES writer: header and thumbnails", () => {
  test("design is centred on the origin and the block size matches the bounds", () => {
    const pts = square(1000, 500, RED, 300); // 60 × 60 mm
    const { width, height, records } = write(pts);
    const xs = records.filter((r) => r.type === "stitch").map((r) => r.x);
    const ys = records.filter((r) => r.type === "stitch").map((r) => r.y);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([-300, 300, -300, 300]);
    expect([width, height]).toEqual([600, 600]);
  });

  test("one thumbnail for the design plus one per colour, each with stitches drawn inside the frame", () => {
    const { graphics } = write([...square(500, 500, RED), ...square(1000, 1000, BLUE)]);
    expect(graphics).toHaveLength(3);
    graphics.forEach((bits) => expect(insideFrame(bits)).toBe(true));
    // The red block's thumbnail has only the top-left square
    const left = (bits) => bits.filter((b, k) => b && k % 48 > 3 && k % 48 < 24 && k / 48 > 3 && k / 48 < 19).length;
    expect(left(graphics[1])).toBeGreaterThan(0);
    expect(left(graphics[2])).toBe(0);
  });

  test("the frame is kept", () => {
    const { graphics } = write(square(0, 0, RED));
    // Top edge of the frame: row 1, columns 4..43
    for (let col = 4; col <= 43; col++) expect(graphics[0][48 + col]).toBe(1);
  });
});
