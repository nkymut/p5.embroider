import { describe, test, expect, beforeEach } from "@jest/globals";
import { TestUtils } from "../helpers/test-utils.js";
import { TEST_PATTERNS } from "../fixtures/test-data.js";
import { GCodeWriter } from "../../src/io/p5-gcode-writer.js";

describe("GCodeWriter (real implementation)", () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  test("generateGCode emits required prologue and terminator", () => {
    const w = new GCodeWriter();
    const points = [
      { x: 10, y: 5 },
      { x: 20.1234, y: 7.8 },
    ];

    const gcode = w.generateGCode(points, "TEST");
    expect(typeof gcode).toBe("string");
    expect(gcode).toContain("G90");
    expect(gcode).toContain("G21");
    expect(gcode).toContain("M30");

    const lines = gcode.split("\n");
    expect(lines[0]).toMatch(/^\(EXTENTS_BOTTOM:/);
    expect(lines).toContain("G90 (use absolute coordinates)");
    expect(lines).toContain("G21 (coordinates will be specified in millimeters)");
    expect(lines[lines.length - 1]).toBe("M30");
  });

  test("formats coordinates with 3 decimals (X/Y) and 1 decimal (Z)", () => {
    const w = new GCodeWriter();
    const gcode = w.generateGCode([{ x: 1.23456, y: 7.89012 }], "PREC");

    expect(gcode).toMatch(/X1\.235/);
    expect(gcode).toMatch(/Y7\.890/);
    // Writer uses Z with 1 decimal
    expect(gcode).toMatch(/Z0\.0/);
    expect(gcode).toMatch(/Z1\.0/);
  });

  test("works with fixture pattern (basic sanity)", () => {
    const w = new GCodeWriter();
    const pattern = TEST_PATTERNS.simpleLine;
    const gcode = w.generateGCode(pattern.vertices, "LINE");

    expect(gcode).toContain("(STITCH_COUNT:" + pattern.vertices.length + ")");
    // Should include at least one movement to the last point
    const last = pattern.vertices[pattern.vertices.length - 1];
    expect(gcode).toContain(`X${last.x.toFixed(3)}`);
    expect(gcode).toContain(`Y${last.y.toFixed(3)}`);
  });
});
