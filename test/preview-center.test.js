import { describe, expect, test } from "@jest/globals";
import { setPreviewCenter } from "../src/utils/preview-viewport.js";

// Same mapping as setupPreviewViewport(): translate(c + pan) · scale(s) · translate(-c)
const toScreen = (st, x, y) => ({
  x: (x - st.centerX) * st.scale + st.centerX + st.panX,
  y: (y - st.centerY) * st.scale + st.centerY + st.panY,
});

describe("setPreviewCenter", () => {
  test.each([0.5, 1, 2, 3.7])("view does not move at scale %p", (scale) => {
    const st = { scale, panX: 12, panY: -30, centerX: 200, centerY: 200 };
    const points = [
      [0, 0],
      [150, 320],
      [-40, 900],
    ];
    const before = points.map(([x, y]) => toScreen(st, x, y));
    setPreviewCenter(300, 175, st);
    expect(st.centerX).toBe(300);
    expect(st.centerY).toBe(175);
    points.forEach(([x, y], i) => {
      const after = toScreen(st, x, y);
      expect(after.x).toBeCloseTo(before[i].x, 9);
      expect(after.y).toBeCloseTo(before[i].y, 9);
    });
  });

  test("pan is unchanged at scale 1", () => {
    const st = { scale: 1, panX: 5, panY: 6, centerX: 200, centerY: 200 };
    setPreviewCenter(567, 380, st);
    expect(st.panX).toBe(5);
    expect(st.panY).toBe(6);
  });

  test("after moving the centre, a mapping about the new centre matches the drawing", () => {
    // The bug: centre stuck at the first canvas size while callers map about width/2
    const st = { scale: 2, panX: 0, panY: 0, centerX: 200, centerY: 200 };
    const width = 600;
    const height = 400;
    setPreviewCenter(width / 2, height / 2, st);
    const drawn = toScreen(st, 100, 100);
    const byHand = {
      x: (100 - width / 2) * st.scale + width / 2 + st.panX,
      y: (100 - height / 2) * st.scale + height / 2 + st.panY,
    };
    expect(byHand.x).toBeCloseTo(drawn.x, 9);
    expect(byHand.y).toBeCloseTo(drawn.y, 9);
  });
});
