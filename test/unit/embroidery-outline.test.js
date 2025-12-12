import { describe, test, expect, beforeAll } from "@jest/globals";
import {
  getConvexHull,
  createBoundingBoxOutline,
  createScaledOutline,
  expandPolygon,
} from "../../src/utils/embroidery-outline.js";

// Minimal p5 vector stubs for Node tests.
// `src/utils/embroidery-outline.js` uses `createVector()` and `p5.Vector.cross()`.
function installP5VectorStubs() {
  global.createVector = (x, y) => ({
    x,
    y,
    heading() {
      return Math.atan2(this.y, this.x);
    },
    magSq() {
      return this.x * this.x + this.y * this.y;
    },
  });

  global.p5 = global.p5 || {};
  global.p5.Vector = global.p5.Vector || {};
  global.p5.Vector.cross = (v1, v2) => ({
    z: v1.x * v2.y - v1.y * v2.x,
  });
}

describe("Embroidery outline geometry (src/utils/embroidery-outline.js)", () => {
  beforeAll(async () => {
    installP5VectorStubs();
  });

  test("getConvexHull removes duplicates and returns a hull", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 }, // duplicate
      { x: 5, y: 5 }, // interior
    ];

    const hull = getConvexHull(points);
    expect(Array.isArray(hull)).toBe(true);
    expect(hull.length).toBeGreaterThanOrEqual(3);

    // Hull should contain the extreme corners
    const key = (p) => `${p.x},${p.y}`;
    const hullKeys = new Set(hull.map(key));
    ["0,0", "10,0", "10,10", "0,10"].forEach((k) => expect(hullKeys.has(k)).toBe(true));
  });

  test("createBoundingBoxOutline expands bounds by offsetDistance and closes path", () => {
    const points = [
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 10, y: 60 },
    ];

    const offset = 5;
    const out = createBoundingBoxOutline(points, offset, 0);
    expect(out.length).toBe(5); // rectangle + closing point
    expect(out[0]).toEqual(out[out.length - 1]);

    const xs = out.map((p) => p.x);
    const ys = out.map((p) => p.y);
    expect(Math.min(...xs)).toBe(10 - offset);
    expect(Math.max(...xs)).toBe(40 + offset);
    expect(Math.min(...ys)).toBe(20 - offset);
    expect(Math.max(...ys)).toBe(60 + offset);
  });

  test("createBoundingBoxOutline with cornerRadius adds more points than a rectangle", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ];
    const out = createBoundingBoxOutline(points, 2, 3);

    // Rounded corners: 4 corners * (segments+1) + closing point
    expect(out.length).toBeGreaterThan(5);
    expect(out[0]).toEqual(out[out.length - 1]);
  });

  test("createScaledOutline increases average distance from centroid roughly by offsetDistance", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    const offset = 5;
    const scaled = createScaledOutline(points, offset);
    expect(scaled.length).toBeGreaterThanOrEqual(points.length);

    const centroid = { x: 5, y: 5 };
    const avgDist = (pts) =>
      pts.reduce((acc, p) => acc + Math.hypot(p.x - centroid.x, p.y - centroid.y), 0) / pts.length;

    const d0 = avgDist(points);
    const d1 = avgDist(scaled);
    expect(d1).toBeGreaterThan(d0);
    expectCoordinateToBeCloseTo(d1 - d0, offset, 0.2);
  });

  test("expandPolygon returns same number of points for closed polygons (no closing point expected)", () => {
    const squareClockwise = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ].reverse(); // clockwise ordering

    const expanded = expandPolygon(squareClockwise, 2);
    expect(expanded.length).toBe(squareClockwise.length);
    expanded.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});

