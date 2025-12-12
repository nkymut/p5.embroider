import { describe, test, expect, beforeEach } from "@jest/globals";
import { TestUtils } from "../helpers/test-utils.js";
import { JSONWriter } from "../../src/io/p5-json-writer.js";

describe("JSONWriter (real implementation)", () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  test("generateJSON emits parseable JSON with expected top-level fields", () => {
    const w = new JSONWriter();
    w.setOptions({ includeBounds: true, includeMetadata: true, precision: 2, compactOutput: false });

    const stitchData = {
      threads: [
        {
          color: { r: 255, g: 0, b: 0 },
          weight: 0.2,
          runs: [[{ x: 0, y: 0, type: "normal" }, { x: 10.1234, y: 5.5678, type: "normal" }]],
        },
      ],
    };

    const jsonText = w.generateJSON(stitchData, "TEST");
    expect(typeof jsonText).toBe("string");
    const obj = JSON.parse(jsonText);

    expect(obj.format).toBe("p5.embroider");
    expect(obj.title).toBe("TEST");
    expect(typeof obj.timestamp).toBe("string");
    // Timestamp is expected to be ISO-8601 in UTC
    expect(obj.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Array.isArray(obj.threads)).toBe(true);
    expect(obj.statistics).toBeDefined();
    expect(obj.bounds).toBeDefined();
    expect(obj.metadata).toBeDefined();
  });

  test("precision option rounds stitch coordinates", () => {
    const w = new JSONWriter();
    w.setOptions({ precision: 1, compactOutput: true, includeBounds: false, includeMetadata: false });

    const stitchData = {
      threads: [
        {
          color: { r: 0, g: 0, b: 0 },
          runs: [[{ x: 1.234, y: 9.876 }]],
        },
      ],
    };

    const obj = JSON.parse(w.generateJSON(stitchData, "PREC"));
    expect(obj.threads[0].runs[0].stitches[0].x).toBe(1.2);
    expect(obj.threads[0].runs[0].stitches[0].y).toBe(9.9);
  });

  test("throws on invalid stitch data", () => {
    const w = new JSONWriter();
    expect(() => w.generateJSON(null, "BAD")).toThrow();
    expect(() => w.generateJSON({}, "BAD")).toThrow();
  });
});

