import { describe, test, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import { TestUtils } from "../helpers/test-utils.js";
import { TEST_PATTERNS, TEST_SETTINGS } from "../fixtures/test-data.js";

// Side-effect import: installs globalThis.p5embroidery
import "../../src/p5.embroider.js";

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function makeStrokeSettings(overrides = {}) {
  // ConvertVerticesToStitches expects stroke-ish fields even when we only want straight stitches.
  // Keep deterministic defaults: resampleNoise must be 0 for stable tests.
  return {
    ...TEST_SETTINGS.default,
    resampleNoise: 0,
    strokeWeight: 0,
    strokeMode: "straight",
    strokeJoin: "round",
    strokeEntry: "right",
    strokeExit: "right",
    ...overrides,
  };
}

function stitchesFromVertices(vertices, strokeSettings) {
  const api = globalThis.p5embroidery;
  if (!api || typeof api.convertVerticesToStitches !== "function") {
    throw new Error("p5embroidery.convertVerticesToStitches is not available (p5.embroider.js not loaded?)");
  }
  return api.convertVerticesToStitches(
    vertices.map((v) => ({ x: v.x, y: v.y, isVert: true })),
    strokeSettings,
  );
}

describe("Stitch Generation (real pipeline via p5embroidery.convertVerticesToStitches)", () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  beforeAll(() => {
    // Ensure deterministic results even if resampleNoise is enabled in the future.
    // (Our tests keep resampleNoise=0, but this prevents accidental flakiness.)
    jest.spyOn(Math, "random").mockImplementation(() => 0.5);
  });

  test("generates correct stitches for a simple horizontal line", () => {
    const settings = makeStrokeSettings({ stitchLength: 3, minStitchLength: 1, strokeWeight: 0 });
    const stitches = stitchesFromVertices(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
      ],
      settings,
    );

    // Implementation uses floor(distance / stitchLength) and includes the start point.
    expect(stitches.length).toBe(11);
    expect(stitches[0]).toEqual({ x: 0, y: 0 });
    expect(stitches[stitches.length - 1]).toEqual({ x: 30, y: 0 });
  });

  test("handles a diagonal line correctly", () => {
    const settings = makeStrokeSettings({ stitchLength: 2.5, minStitchLength: 1, strokeWeight: 0 });
    const stitches = stitchesFromVertices(
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
      settings,
    );

    expect(stitches.length).toBe(3);
    expect(stitches[0]).toEqual({ x: 0, y: 0 });
    expectCoordinateToBeCloseTo(stitches[1].x, 1.5, 0.01);
    expectCoordinateToBeCloseTo(stitches[1].y, 2, 0.01);
    expect(stitches[2]).toEqual({ x: 3, y: 4 });
  });

  test("short segments below minStitchLength produce only the start stitch (current behavior)", () => {
    const settings = makeStrokeSettings({ stitchLength: 3, minStitchLength: 1, strokeWeight: 0 });
    const stitches = stitchesFromVertices(
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
      ],
      settings,
    );

    expect(stitches).toEqual([{ x: 0, y: 0 }]);
  });

  test("zero-length lines produce a single stitch (current behavior)", () => {
    const settings = makeStrokeSettings({ stitchLength: 3, minStitchLength: 1, strokeWeight: 0 });
    const stitches = stitchesFromVertices(
      [
        { x: 5, y: 10 },
        { x: 5, y: 10 },
      ],
      settings,
    );

    expect(stitches).toEqual([{ x: 5, y: 10 }]);
  });

  test("respects different stitch lengths (counts)", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
    ];

    const stitches2mm = stitchesFromVertices(vertices, makeStrokeSettings({ stitchLength: 2, minStitchLength: 1 }));
    const stitches5mm = stitchesFromVertices(vertices, makeStrokeSettings({ stitchLength: 5, minStitchLength: 1 }));

    expect(stitches2mm.length).toBe(11); // start + 10 steps (includes endpoint as t=1)
    expect(stitches5mm.length).toBe(5); // start + 4 steps (includes endpoint as t=1)
  });

  test("handles a rectangle path (polyline) and stays within bounds", () => {
    const rect = TestUtils.createRectangleVertices(0, 0, 20, 15);
    const settings = makeStrokeSettings({ stitchLength: 5, minStitchLength: 1, strokeWeight: 0 });
    const stitches = stitchesFromVertices(rect, settings);

    TestUtils.validateStitchSequence(stitches);
    expect(stitches.length).toBeGreaterThan(10);

    stitches.forEach((s) => {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(20);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(15);
    });
  });

  test("integration with fixture patterns: stitch count and spacing sanity", () => {
    const pattern = TEST_PATTERNS.simpleLine;
    const settings = makeStrokeSettings({ ...TEST_SETTINGS.default, strokeWeight: 0 });
    const stitches = stitchesFromVertices(pattern.vertices, settings);

    TestUtils.validateStitchSequence(stitches);
    expect(stitches.length).toBeGreaterThan(30);
    expect(stitches.length).toBeLessThan(40);

    // Spacing sanity: consecutive distances should not exceed stitchLength by much when resampleNoise=0.
    for (let i = 1; i < stitches.length; i++) {
      const d = distance(stitches[i - 1], stitches[i]);
      expect(d).toBeLessThanOrEqual(settings.stitchLength + 1e-9);
    }
  });
});