import { describe, expect, test } from "@jest/globals";
import { analysePath, outerJoinPoints, zigzagWithCorners } from "../src/utils/zigzag-corners.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function segDist(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
  return Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t);
}

// Polyline turning by the given angles (degrees), each segment `len` mm long
function turns(angles, len = 15, width = 4) {
  const pts = [{ x: 0, y: 0, width }];
  let h = 0;
  for (const a of [0, ...angles]) {
    h += (a * Math.PI) / 180;
    const p = pts[pts.length - 1];
    pts.push({ x: p.x + Math.cos(h) * len, y: p.y + Math.sin(h) * len, width });
  }
  return pts;
}

/**
 * Points of the stroke that are farther than density + 0.1 mm from every stitch.
 * shape "round": points within width/2 of the centreline (the open end caps excluded).
 * shape "bevel": the same without the round corner caps, plus the bevel triangle at each corner.
 */
function gaps(points, needles, opts, shape = "round") {
  const { pts, segs, corners, closed } = analysePath(points, opts);
  const maxR = Math.max(...pts.map((p) => p.w / 2));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const step = 0.1;
  const thr = opts.density + 0.1;
  const inTriangle = (p, a, b, c) => {
    const s = (u, v, w) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
    const d1 = s(a, b, p);
    const d2 = s(b, c, p);
    const d3 = s(c, a, p);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  const out = [];
  for (let y = Math.min(...ys) - maxR; y <= Math.max(...ys) + maxR; y += step) {
    for (let x = Math.min(...xs) - maxR; x <= Math.max(...xs) + maxR; x += step) {
      const p = { x, y };
      let inside = false;
      segs.forEach((s, i) => {
        const tr = ((p.x - s.a.x) * s.d.x + (p.y - s.a.y) * s.d.y) / s.len;
        if (
          shape === "bevel" ? tr < 0 || tr > 1 : !closed && ((i === 0 && tr < 0) || (i === segs.length - 1 && tr > 1))
        )
          return;
        const t = Math.max(0, Math.min(1, tr));
        const c = { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
        if (dist(p, c) <= (s.a.w + (s.b.w - s.a.w) * t) / 2) inside = true;
      });
      if (shape === "bevel")
        corners.forEach((c) => {
          if (c && c.hard) {
            const [o1, o2] = outerJoinPoints(c, { ...opts, strokeJoin: "bevel" });
            if (inTriangle(p, c.p, o1, o2)) inside = true;
          }
        });
      if (!inside) continue;
      let best = Infinity;
      for (let i = 0; i < needles.length - 1 && best > thr; i++)
        best = Math.min(best, segDist(p, needles[i], needles[i + 1]));
      if (best > thr) out.push(p);
    }
  }
  return out;
}

function maxPile(needles, radius = 0.3) {
  let max = 0;
  for (const p of needles) max = Math.max(max, needles.filter((q) => dist(p, q) <= radius).length);
  return max;
}

const maxStitch = (needles) => Math.max(...needles.slice(1).map((p, i) => dist(p, needles[i])));

describe("zigzagWithCorners", () => {
  test("a collinear vertex changes nothing", () => {
    const opts = { density: 0.5, strokeWeight: 3 };
    const a = zigzagWithCorners(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
      ],
      opts,
    );
    const b = zigzagWithCorners(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
      opts,
    );
    expect(a.length).toBe(b.length);
    a.forEach((p, i) => {
      expect(p.x).toBeCloseTo(b[i].x, 9);
      expect(p.y).toBeCloseTo(b[i].y, 9);
    });
  });

  test.each(["round", "miter"])("%s join leaves no gap at 30°, 60°, 90° and 135° turns", (strokeJoin) => {
    const path = turns([30, -60, 90, -135]);
    const opts = { density: 0.5, strokeJoin };
    expect(gaps(path, zigzagWithCorners(path, opts), opts)).toEqual([]);
  });

  test("bevel join covers the stroke up to the bevel line", () => {
    const path = turns([30, -60, 90, -135]);
    const opts = { density: 0.5, strokeJoin: "bevel" };
    expect(gaps(path, zigzagWithCorners(path, opts), opts, "bevel")).toEqual([]);
  });

  test("variable widths (vertexWidth) leave no gap", () => {
    const path = [
      [20, 50, 2],
      [30, 55, 6],
      [40, 58, 8],
      [50, 58, 8],
      [60, 55, 6],
      [70, 50, 2],
      [80, 50, 2],
      [90, 55, 6],
    ].map(([x, y, width]) => ({ x, y, width }));
    const opts = { density: 0.3 };
    expect(gaps(path, zigzagWithCorners(path, opts), opts)).toEqual([]);
  });

  test("closed square: every corner covered, the ring returns to its start", () => {
    const sq = [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
      [0, 0],
    ].map(([x, y]) => ({ x, y, width: 4 }));
    for (const strokeJoin of ["round", "miter"]) {
      const opts = { density: 0.5, strokeJoin };
      const needles = zigzagWithCorners(sq, opts);
      expect(gaps(sq, needles, opts)).toEqual([]);
      expect(dist(needles[0], needles[needles.length - 1])).toBeLessThan(4 * Math.SQRT2 + 0.01);
    }
  });

  test("cross stitches stay within the miter length and the machine limit", () => {
    const path = turns([90, -120, 150], 15, 4);
    for (const strokeJoin of ["round", "miter", "bevel"]) {
      const needles = zigzagWithCorners(path, { density: 0.4, strokeJoin, maxStitchLength: 12 });
      expect(maxStitch(needles)).toBeLessThanOrEqual(12);
    }
    // a 90° miter: the bisector stitch is width / cos(45°), its neighbours one step longer at most
    const needles = zigzagWithCorners(turns([90], 15, 4), { density: 0.4, strokeJoin: "miter" });
    expect(maxStitch(needles)).toBeLessThanOrEqual(4 / Math.cos(Math.PI / 4) + 0.4);
  });

  test("round corners spread the inner needle points (cornerSpacing)", () => {
    const path = turns([120], 15, 6);
    const spaced = zigzagWithCorners(path, { density: 0.3, strokeJoin: "round", cornerSpacing: 0.3 });
    expect(maxPile(spaced)).toBeLessThanOrEqual(4);
    const unmerged = zigzagWithCorners(path, { density: 0.3, strokeJoin: "round", cornerSpacing: 0 });
    expect(unmerged.length).toBeGreaterThan(spaced.length);
  });

  test("per-vertex widths set the rail distance", () => {
    const path = [
      { x: 0, y: 0, width: 2 },
      { x: 10, y: 0, width: 6 },
      { x: 20, y: 5, width: 4 },
    ];
    const needles = zigzagWithCorners(path, { density: 0.5, strokeEntry: "left" });
    expect(dist(needles[0], path[0])).toBeCloseTo(1, 6);
    const last = needles[needles.length - 1];
    expect(dist(last, path[2])).toBeCloseTo(2, 6);
  });

  test("join points: miter 1, bevel along the bevel line, round on the arc; long miters become bevels", () => {
    const { corners } = analysePath(turns([90], 15, 4), { density: 0.4 });
    const c = corners[1];
    expect(outerJoinPoints(c, { strokeJoin: "miter", density: 0.4 })).toHaveLength(1);
    const bevel = outerJoinPoints(c, { strokeJoin: "bevel", density: 0.4 });
    expect(bevel).toHaveLength(Math.ceil((2 * Math.SQRT2) / 0.4) + 1); // bevel line 2√2 mm long
    bevel.forEach((p) => expect(p.x - 15 - (p.y + 2)).toBeCloseTo(0, 9)); // all on the line y = x - 17
    const round = outerJoinPoints(c, { strokeJoin: "round", density: 0.4 });
    round.forEach((p) => expect(dist(p, c.p)).toBeCloseTo(2, 9));
    const sharp = analysePath(turns([165], 15, 4), { density: 0.4 }).corners[1];
    const capped = outerJoinPoints(sharp, { strokeJoin: "miter", miterLimit: 4, density: 0.4 });
    expect(capped).toEqual(outerJoinPoints(sharp, { strokeJoin: "bevel", density: 0.4 }));
  });

  test("hairpins, U-turns and tiny segments give finite points", () => {
    const cases = [
      turns([170], 10, 3),
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 0.0001 },
      ],
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10.05, y: 0 },
        { x: 10.05, y: 10 },
      ],
    ];
    for (const path of cases)
      for (const strokeJoin of ["round", "miter", "bevel"]) {
        const needles = zigzagWithCorners(path, { density: 0.3, strokeWeight: 3, strokeJoin });
        expect(needles.length).toBeGreaterThan(2);
        needles.forEach((p) => expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true));
      }
  });

  test("a finely sampled curve keeps the requested density on its outer edge", () => {
    const r = 10;
    const pts = [];
    for (let a = 0; a <= Math.PI; a += 0.02) pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); // 0.2 mm segments
    const needles = zigzagWithCorners(pts, { density: 0.5, strokeWeight: 3 });
    const expected = (Math.PI * (r + 1.5)) / 0.5; // outer edge radius r + width / 2
    expect(needles.length).toBeGreaterThan(expected * 0.9);
    expect(needles.length).toBeLessThan(expected * 1.1);
  });
});
