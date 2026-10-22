import { describe, expect, test } from "@jest/globals";
import { chooseGridSteps, visibleWorldRect } from "../src/utils/preview-viewport.js";

const PX_PER_MM = 96 / 25.4;

describe("chooseGridSteps", () => {
  test.each([
    // [viewport scale, minor, major]
    [0.5, 5, 50], // 1.89 px/mm
    [1, 2, 10], // 3.78 px/mm
    [2, 1, 10], // 7.56 px/mm
    [5, 1, 10], // 18.9 px/mm
    [0.1, 20, 100], // 0.378 px/mm
  ])("scale %p -> %p / %p mm", (scale, minor, major) => {
    expect(chooseGridSteps(PX_PER_MM * scale)).toEqual({ minorMm: minor, majorMm: major });
  });

  test("respects minScreenPx", () => {
    expect(chooseGridSteps(PX_PER_MM, 3).minorMm).toBe(1);
    expect(chooseGridSteps(PX_PER_MM, 20).minorMm).toBe(10);
  });

  test("falls back to the coarsest step when zoomed far out", () => {
    expect(chooseGridSteps(0.001)).toEqual({ minorMm: 100, majorMm: 500 });
  });
});

describe("visibleWorldRect", () => {
  test("identity transform is the canvas", () => {
    const m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    expect(visibleWorldRect(m, 800, 600)).toEqual({ x0: 0, y0: 0, x1: 800, y1: 600 });
  });

  test("pan + zoom + pixelDensity 2", () => {
    // device px = 2 * (3 * world + 100)  =>  world = (css - 100) / 3
    const m = { a: 6, b: 0, c: 0, d: 6, e: 200, f: 200 };
    const r = visibleWorldRect(m, 400, 300, 2);
    expect(r.x0).toBeCloseTo(-100 / 3);
    expect(r.y0).toBeCloseTo(-100 / 3);
    expect(r.x1).toBeCloseTo(100);
    expect(r.y1).toBeCloseTo(200 / 3);
  });

  test("rotation takes the bounding box of all four corners", () => {
    // 90 degrees: world (x, y) -> screen (-y, x)
    const m = { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 };
    const r = visibleWorldRect(m, 100, 50);
    expect(r.x0).toBeCloseTo(0);
    expect(r.x1).toBeCloseTo(50);
    expect(r.y0).toBeCloseTo(-100);
    expect(r.y1).toBeCloseTo(0);
  });

  test("degenerate matrix returns the canvas", () => {
    const m = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
    expect(visibleWorldRect(m, 10, 20)).toEqual({ x0: 0, y0: 0, x1: 10, y1: 20 });
  });
});
