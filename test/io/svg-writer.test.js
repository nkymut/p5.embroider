import { describe, test, expect, beforeEach } from "@jest/globals";
import { TestUtils } from "../helpers/test-utils.js";
import { SVGWriter } from "../../src/io/p5-svg-writer.js";

describe("SVGWriter (real implementation)", () => {
  beforeEach(() => {
    TestUtils.resetAllMocks();
  });

  test("generateSVG produces an SVG document with mm units", () => {
    const w = new SVGWriter();
    w.setOptions({ paperSize: "A4", showGuides: false, showHoop: false });

    const stitchData = {
      threads: [
        {
          color: { r: 255, g: 0, b: 0 },
          runs: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]],
        },
      ],
    };

    const svg = w.generateSVG(stitchData, "TEST");
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="');
    expect(svg).toContain("mm");
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain("<!-- TITLE: TEST -->");
  });

  test("threads option filters exported threads", () => {
    const w = new SVGWriter();
    w.setOptions({ threads: [0], showGuides: false, showHoop: false });

    const stitchData = {
      threads: [
        {
          color: { r: 255, g: 0, b: 0 },
          runs: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]],
        },
        {
          color: { r: 0, g: 255, b: 0 },
          runs: [[{ x: 0, y: 10 }, { x: 10, y: 10 }]],
        },
      ],
    };

    const svg = w.generateSVG(stitchData, "FILTER");
    expect(svg).toContain('stroke="rgb(255, 0, 0)"');
    expect(svg).not.toContain('stroke="rgb(0, 255, 0)"');
  });

  test("stitchDots option hides dot circles when false", () => {
    const w = new SVGWriter();
    w.setOptions({ stitchDots: false, showGuides: false, showHoop: false });

    const stitchData = {
      threads: [
        {
          color: { r: 0, g: 0, b: 0 },
          runs: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]],
        },
      ],
    };

    const svg = w.generateSVG(stitchData, "NODOTS");
    // Dots are rendered as circles with fill #ff0000 when enabled.
    expect(svg).not.toContain('fill="#ff0000"');
  });
});

