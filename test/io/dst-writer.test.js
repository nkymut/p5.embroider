import { describe, test, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import { TestUtils } from "../helpers/test-utils.js";
import { DST_TEST_DATA } from "../fixtures/test-data.js";
import { DSTWriter } from "../../src/io/p5-tajima-dst-writer.js";

function decodeHeader(dstBytes) {
  const headerBytes = dstBytes.slice(0, 512);
  // Header is ASCII-ish with padding spaces.
  return String.fromCharCode(...headerBytes);
}

describe("DSTWriter (real implementation)", () => {
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeAll(() => {
    // The implementation currently has _DEBUG_DST=true; silence log spam.
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
  });

  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  test("initializes with correct defaults", () => {
    const w = new DSTWriter();
    expect(w.currentX).toBe(0);
    expect(w.currentY).toBe(0);
    expect(w.stitchCount).toBe(0);
    expect(Array.isArray(w.data)).toBe(true);
  });

  test("generateDST returns Uint8Array with header and record payload", () => {
    const w = new DSTWriter();
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];

    const dst = w.generateDST(points, "TEST");

    expect(dst).toBeInstanceOf(Uint8Array);
    expect(dst.length).toBeGreaterThan(512);
    expect((dst.length - 512) % 3).toBe(0);

    const header = decodeHeader(dst);
    expect(header.startsWith("LA:")).toBe(true);
    expect(header).toMatch(/ST:\s*\d+\r/);
    expect(header).toMatch(/CO:\s*\d+\r/);
  });

  test("generateDST ends with END record bytes (00 00 F3)", () => {
    const w = new DSTWriter();
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];

    const dst = w.generateDST(points, "ENDTEST");
    const end = Array.from(dst.slice(dst.length - 3));
    expect(end).toEqual([0x00, 0x00, 0xf3]);
  });

  test("counts color changes in CO header field", () => {
    const w = new DSTWriter();
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { colorChange: true },
      { x: 10, y: 10 },
    ];

    const dst = w.generateDST(points, "COLORTEST");
    const header = decodeHeader(dst);
    expect(header).toMatch(/CO:\s*1\r/);
  });

  test("works with fixture pattern input (basic sanity)", () => {
    const w = new DSTWriter();
    const pattern = DST_TEST_DATA.simplePattern;
    const points = pattern.stitches.map((s) => ({ x: s.x, y: s.y }));

    const dst = w.generateDST(points, "PATTERN");
    expect(TestUtils.validateDSTFormat(dst)).toBe(true);
  });
});
