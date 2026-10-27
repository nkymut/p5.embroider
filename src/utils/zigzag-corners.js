/**
 * p5.embroider zigzag stroke with corner joins
 *
 * Builds a zigzag (satin-like) stroke whose two edges are offset rails with real joins at every
 * corner, so the outside of a corner is covered and the inside does not stack needle holes.
 * Pure geometry: millimetres in, millimetres out, no p5.
 *
 * - Each path vertex gets a rail point per side. At a corner the inner side has one point on the
 *   corner bisector; the outer side has one point (miter) or several (bevel, round).
 * - Samples are spaced by arc length between "hard" corners (turns of at least `hardCornerAngle` whose
 *   outer arc is at least one zigzag step long); gentler bends just use miter rails. Each sample maps
 *   to the rails by segment + local t, so the two edges stay in step even when one is much longer.
 * - At a hard corner with several outer points the stroke fans: inner, outer, inner, outer… The inner
 *   points are spread along the inner edge and merged when closer than `cornerSpacing`, so the inner
 *   corner is not pierced again and again.
 */

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const rotate = (a, ang) => ({
  x: a.x * Math.cos(ang) - a.y * Math.sin(ang),
  y: a.x * Math.sin(ang) + a.y * Math.cos(ang),
});
const sideKey = (s) => (s > 0 ? "L" : "R"); // +1 = left of the direction of travel, -1 = right

/** Default options. All lengths in mm. */
export const ZIGZAG_CORNER_DEFAULTS = {
  strokeWeight: 2, // width where a point has no width of its own
  density: 0.4, // distance along the path between needle points
  strokeJoin: "round", // "round" | "miter" | "bevel"
  miterLimit: 4, // miter length / half width; longer miters become bevels
  maxStitchLength: 12, // a miter whose cross stitch would be longer becomes a bevel
  cornerSpacing: 0.3, // inner-corner needle points closer than this are merged (0 = never)
  strokeEntry: "left", // side of the first point: "left" | "right" | "middle"
  strokeExit: null, // side of the last point; null leaves the zigzag where it lands
  closed: false, // also detected when the first and last points coincide
  hardCornerAngle: 25, // degrees; gentler bends (sampled curves) are not treated as corners
};

/**
 * Cleans the path and computes segments and corners.
 * @param {Array<{x:number, y:number, width:(number|undefined)}>} points
 * @param {Object} opts
 * @returns {{pts:Array, segs:Array, corners:Array, closed:boolean}}
 */
export function analysePath(points, opts = {}) {
  const o = { ...ZIGZAG_CORNER_DEFAULTS, ...opts };
  const pts = [];
  for (const p of points || []) {
    const w = p.width ? Math.abs(p.width) : o.strokeWeight; // a negative width means the same width
    if (!pts.length || dist(p, pts[pts.length - 1]) > 0.01) pts.push({ x: p.x, y: p.y, w });
  }
  let closed = !!o.closed;
  if (pts.length > 2 && dist(pts[0], pts[pts.length - 1]) <= 0.01) {
    pts.pop(); // endShape(CLOSE) repeats the first vertex
    closed = true;
  }
  if (pts.length < 3) closed = false;

  const n = pts.length;
  const segs = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = dist(a, b);
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    segs.push({ a, b, len, d, n: { x: -d.y, y: d.x } });
  }

  const corners = pts.map((p, j) => {
    const inSeg = closed ? segs[(j - 1 + n) % n] : segs[j - 1];
    const outSeg = segs[j];
    if (!inSeg || !outSeg) return null; // open end
    const theta = Math.atan2(cross(inSeg.d, outSeg.d), dot(inSeg.d, outSeg.d));
    // |m| = 1 / cos(theta / 2); the floor keeps a full U-turn finite (it becomes a bevel or round)
    const m = mul(add(inSeg.n, outSeg.n), 1 / Math.max(1e-6, 1 + dot(inSeg.n, outSeg.n)));
    const r = p.w / 2;
    return {
      p,
      r,
      inSeg,
      outSeg,
      theta,
      m,
      outer: theta > 0 ? -1 : 1, // a left turn has its outside on the right
      hard: Math.abs(theta) >= (o.hardCornerAngle * Math.PI) / 180 && r * Math.abs(theta) >= o.density,
    };
  });
  return { pts, segs, corners, closed };
}

/**
 * Points on the outer edge of a corner, in walking order.
 * @private
 */
export function outerJoinPoints(c, opts = {}) {
  const o = { ...ZIGZAG_CORNER_DEFAULTS, ...opts };
  const { p, r, outer, theta, inSeg, outSeg, m } = c;
  const miter = add(p, mul(m, outer * r));
  if (!c.hard) return [miter];
  let join = o.strokeJoin;
  const miterRatio = Math.hypot(m.x, m.y);
  if (join === "miter" && (miterRatio > o.miterLimit || 2 * r * miterRatio > o.maxStitchLength)) join = "bevel";
  if (join === "miter") return [miter];
  if (join === "bevel") {
    // Points along the bevel line at zigzag spacing, so the corner triangle fans like a round join
    const a = add(p, mul(inSeg.n, outer * r));
    const b = add(p, mul(outSeg.n, outer * r));
    const steps = Math.max(1, Math.ceil(dist(a, b) / o.density));
    return Array.from({ length: steps + 1 }, (_, k) => lerp(a, b, k / steps));
  }
  const steps = Math.max(1, Math.ceil((r * Math.abs(theta)) / o.density));
  const start = mul(inSeg.n, outer * r);
  const arc = [];
  for (let k = 0; k <= steps; k++) arc.push(add(p, rotate(start, (theta * k) / steps)));
  return arc;
}

/**
 * Inner corner point on the bisector. When a neighbouring segment is too short for the full miter
 * the point is pulled towards the centreline, so the inner edge cannot fold back on itself.
 * @private
 */
function innerJoinPoint(c) {
  const { p, r, outer, theta, inSeg, outSeg, m } = c;
  const along = r * Math.tan(Math.abs(theta) / 2);
  const maxAlong = 0.5 * Math.min(inSeg.len, outSeg.len);
  const k = along > maxAlong ? maxAlong / along : 1;
  return add(p, mul(m, -outer * r * k));
}

/**
 * Zigzag needle points for a path, with joins at the corners.
 * @param {Array<{x:number, y:number, width:(number|undefined)}>} points - Path in mm; `width` per point is optional.
 * @param {Object} opts - See ZIGZAG_CORNER_DEFAULTS.
 * @returns {Array<{x:number, y:number}>} Needle points in mm, in sewing order.
 */
export function zigzagWithCorners(points, opts = {}) {
  const o = { ...ZIGZAG_CORNER_DEFAULTS, ...opts };
  const { pts, segs, corners, closed } = analysePath(points, o);
  if (!segs.length) return pts.map((p) => ({ x: p.x, y: p.y }));
  const n = pts.length;

  // Rail end points per vertex: where the incoming segment ends and the outgoing one starts
  const V = pts.map((p, j) => {
    const c = corners[j];
    if (!c) {
      const s = segs[j] || segs[j - 1];
      const L = add(p, mul(s.n, p.w / 2));
      const R = add(p, mul(s.n, -p.w / 2));
      return { railIn: { L, R }, railOut: { L, R }, c: null };
    }
    const O = outerJoinPoints(c, o);
    const I = innerJoinPoint(c);
    return {
      railIn: { [sideKey(c.outer)]: O[0], [sideKey(-c.outer)]: I },
      railOut: { [sideKey(c.outer)]: O[O.length - 1], [sideKey(-c.outer)]: I },
      O,
      I,
      c,
    };
  });

  const out = [];
  let side = o.strokeEntry === "right" ? -1 : 1;
  const emit = (pt) => {
    out.push({ x: pt.x, y: pt.y });
    side = -side;
  };

  // Runs of segments between hard corners; each run is sampled evenly by arc length
  const vertexAt = (k) => k % n; // segment k ends at vertex k + 1
  const breaks = [0];
  for (let k = 1; k < segs.length; k++) if (corners[k] && corners[k].hard) breaks.push(k);
  breaks.push(segs.length);

  for (let b = 0; b < breaks.length - 1; b++) {
    const first = breaks[b];
    const last = breaks[b + 1]; // exclusive segment index
    let runLen = 0;
    const railLen = { L: 0, R: 0 };
    for (let k = first; k < last; k++) {
      runLen += segs[k].len;
      for (const key of ["L", "R"]) railLen[key] += dist(V[k].railOut[key], V[vertexAt(k + 1)].railIn[key]);
    }
    // Space by the longest of centreline and rails: after a sharp miter the outer edge is longer
    const count = Math.max(1, Math.round(Math.max(runLen, railLen.L, railLen.R) / o.density));

    let k = first;
    let acc = 0;
    for (let q = b === 0 ? 0 : 1; q <= count; q++) {
      const target = (runLen * q) / count;
      while (k < last - 1 && acc + segs[k].len < target) acc += segs[k++].len;
      const t = Math.min(1, Math.max(0, (target - acc) / segs[k].len));
      const A = V[k].railOut;
      const B = V[vertexAt(k + 1)].railIn;
      if (b === 0 && q === 0 && o.strokeEntry === "middle") {
        out.push({ x: segs[0].a.x, y: segs[0].a.y }); // start on the centreline, then go left
        continue;
      }
      emit(lerp(A[sideKey(side)], B[sideKey(side)], t));
    }

    // Hard corner at the end of the run (for a closed path the last run ends at vertex 0)
    const v = V[vertexAt(last)];
    if (!v.c || !v.c.hard || v.O.length < 2 || (!closed && last === segs.length)) continue;
    const { outer, inSeg, outSeg } = v.c;
    const landedOuter = -side === outer;
    const seq = landedOuter ? [] : [v.O[0]];
    for (let q = 1; q < v.O.length; q++) seq.push(null, v.O[q]); // null = an inner point
    const nInner = v.O.length - 1;
    // Spread the inner points along the inner edge around the corner instead of one hole
    const spread = Math.min(0.4 * inSeg.len, 0.4 * outSeg.len, (nInner * o.density) / 2);
    let lastInner = out[out.length - (landedOuter ? 2 : 1)];
    let i = 0;
    for (const x of seq) {
      if (x) {
        out.push({ x: x.x, y: x.y });
        continue;
      }
      const u = spread * ((2 * i++ + 1) / nInner - 1);
      const ip = add(v.I, mul(u < 0 ? inSeg.d : outSeg.d, u));
      if (lastInner && dist(ip, lastInner) < o.cornerSpacing) continue; // merge into the previous hole
      out.push(ip);
      lastInner = ip;
    }
    side = -outer; // a corner always ends on its outer side
  }

  // Exit side: move the last point to the requested side of the last segment
  if (!closed && o.strokeExit && out.length > 1) {
    const s = segs[segs.length - 1];
    const e = pts[n - 1];
    const k = o.strokeExit === "middle" ? 0 : o.strokeExit === "left" ? 1 : -1;
    out[out.length - 1] = add(e, mul(s.n, (k * e.w) / 2));
  }
  return out;
}
