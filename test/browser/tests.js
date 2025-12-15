/* global __mocha_describe, __mocha_it, __mocha_beforeEach */

(function () {
  const assert = window.__assert;
  const describe = window.__mocha_describe;
  const it = window.__mocha_it;
  const beforeEach = window.__mocha_beforeEach;

  function ensureAPI() {
    assert.isFunction(window.beginRecord, "beginRecord should be on window");
    assert.isFunction(window.endRecord, "endRecord should be on window");
    assert.isObject(window.p5embroidery, "p5embroidery should be on window");
    assert.isFunction(window.p5embroidery.endRecord, "p5embroidery.endRecord should exist");
  }

  function minimalStrokeSetup() {
    // Ensure stroke is enabled so line() creates stitches
    stroke(0);
    strokeWeight(1);
    noFill();
  }

  async function exportJSONCaptured(options = {}) {
    const blob = await window.__withCapturedBlob(async () => {
      window.p5embroidery.exportJSON("browser-sanity.json", {
        compactOutput: true,
        includeBounds: false,
        includeMetadata: false,
        precision: 2,
        ...options,
      });
    });
    const jsonText = await blob.text();
    return JSON.parse(jsonText);
  }

  function firstStitch(obj, threadIndex = 0, runIndex = 0) {
    return obj.threads?.[threadIndex]?.runs?.[runIndex]?.stitches?.[0];
  }

  describe("p5.embroider browser sanity", function () {
    beforeEach(async function () {
      await window.__waitForP5Ready();
      ensureAPI();
      background(255);
      // Avoid transform leakage across tests
      if (typeof resetMatrix === "function") resetMatrix();
      // Default draw mode for most tests
      if (window.p5embroidery?.setDrawMode) window.p5embroidery.setDrawMode("stitch");
    });

    it("beginRecord overrides and endRecord restores global p5 functions (line)", async function () {
      const originalLine = window.line;
      const originalBeginShape = window.beginShape;
      const originalVertex = window.vertex;
      assert.isFunction(originalLine, "window.line should exist (global p5 mode)");

      window.beginRecord(window.__p5_instance);
      assert.notStrictEqual(window.line, originalLine, "line should be overridden during recording");
      assert.notStrictEqual(window.beginShape, originalBeginShape, "beginShape should be overridden during recording");
      assert.notStrictEqual(window.vertex, originalVertex, "vertex should be overridden during recording");

      window.endRecord();
      assert.strictEqual(window.line, originalLine, "line should be restored after endRecord");
      assert.strictEqual(window.beginShape, originalBeginShape, "beginShape should be restored after endRecord");
      assert.strictEqual(window.vertex, originalVertex, "vertex should be restored after endRecord");
    });

    it("records stitches from line() and exportJSON produces non-empty thread data", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();

      // draw a simple line in mm units (p5.embroider uses mm internal units)
      line(0, 0, 40, 0);
      window.endRecord();

      const obj = await exportJSONCaptured({ includeBounds: true, includeMetadata: true });

      assert.equal(obj.format, "p5.embroider");
      assert.isArray(obj.threads);
      assert.isAtLeast(obj.threads.length, 1);

      // Check at least one run exists with stitches
      const runs = obj.threads[0].runs;
      assert.isArray(runs);
      assert.isAtLeast(runs.length, 1);
      assert.isAtLeast(runs[0].stitches.length, 1);
    });

    it("translate() affects recorded coordinates in stitch mode (sanity)", async function () {
      // Record without translation
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      line(0, 0, 20, 0);
      window.endRecord();

      const a = await exportJSONCaptured();
      const aFirst = firstStitch(a);

      // Record with translation
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      translate(10, 0);
      line(0, 0, 20, 0);
      window.endRecord();

      const b = await exportJSONCaptured();
      const bFirst = firstStitch(b);

      // The translated stitch should have larger x.
      assert.isAbove(bFirst.x, aFirst.x, "translated x should be greater than non-translated x");
    });

    it("setDrawMode('p5') disables transform application to recorded stitches (sanity)", async function () {
      // Baseline: stitch mode + translate => stitches should shift
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      window.p5embroidery.setDrawMode("stitch");
      translate(10, 0);
      line(0, 0, 20, 0);
      window.endRecord();
      const shifted = await exportJSONCaptured();
      const shiftedFirst = firstStitch(shifted);

      // p5 mode: translate should NOT be applied to recorded coords
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      window.p5embroidery.setDrawMode("p5");
      translate(10, 0);
      line(0, 0, 20, 0);
      window.endRecord();
      const unshifted = await exportJSONCaptured();
      const unshiftedFirst = firstStitch(unshifted);

      // Compare: stitch-mode-first should be greater than p5-mode-first.
      assert.isAbove(shiftedFirst.x, unshiftedFirst.x, "stitch mode should apply translate, p5 mode should not");
    });

    it("records stitches from beginShape/vertex/endShape (polyline) and exports JSON", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();

      beginShape();
      vertex(0, 0);
      vertex(20, 0);
      vertex(20, 20);
      endShape();

      window.endRecord();
      const obj = await exportJSONCaptured();
      assert.isAtLeast(obj.threads.length, 1);
      assert.isAtLeast(obj.threads[0].runs.length, 1);
      assert.isAtLeast(obj.threads[0].runs[0].stitches.length, 2);
    });

    it("exportSVG produces an SVG blob (no download)", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      line(0, 0, 40, 0);
      window.endRecord();

      const blob = await window.__withCapturedBlob(async () => {
        window.p5embroidery.exportSVG("browser-sanity.svg", { showGuides: false, showHoop: false, stitchDots: false });
      });

      assert.equal(blob.type, "image/svg+xml", "SVG export should use image/svg+xml blob type");
      const svgText = await blob.text();
      assert.ok(svgText.includes("<svg"), "SVG content should include <svg");
    });

    it("push()/pop() scopes transforms for recorded stitches", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();

      // Run A: with translate inside push/pop
      push();
      translate(10, 0);
      line(0, 0, 10, 0);
      pop();

      // Run B: no translate
      line(0, 0, 10, 0);

      window.endRecord();
      const obj = await exportJSONCaptured();

      assert.isAtLeast(obj.threads[0].runs.length, 2, "should have at least two recorded runs");
      const a0 = obj.threads[0].runs[0].stitches[0];
      const b0 = obj.threads[0].runs[1].stitches[0];
      assert.isAbove(a0.x, b0.x, "first run should be translated, second run should not");
    });

    it("rotate() affects recorded coordinates in stitch mode (sanity)", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();

      // Rotate 90deg around origin: (10,0) -> (0,10)
      rotate(HALF_PI);
      line(0, 0, 10, 0);
      window.endRecord();

      const obj = await exportJSONCaptured();
      const stitches = obj.threads[0].runs[0].stitches;
      const xs = stitches.map((s) => s.x);
      const ys = stitches.map((s) => s.y);

      const xSpan = Math.max(...xs) - Math.min(...xs);
      const ySpan = Math.max(...ys) - Math.min(...ys);

      // Expect mostly vertical line after rotation
      assert.ok(ySpan > xSpan, "rotated line should have larger Y span than X span");
    });

    it("scale() affects recorded coordinates in stitch mode (sanity)", async function () {
      // Baseline (no scale)
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      line(0, 0, 10, 0);
      window.endRecord();
      const base = await exportJSONCaptured();
      const baseStitches = base.threads[0].runs[0].stitches;
      const baseMaxX = Math.max(...baseStitches.map((s) => s.x));

      // Scaled
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      scale(2);
      line(0, 0, 10, 0);
      window.endRecord();
      const scaled = await exportJSONCaptured();
      const scaledStitches = scaled.threads[0].runs[0].stitches;
      const scaledMaxX = Math.max(...scaledStitches.map((s) => s.x));

      assert.isAbove(scaledMaxX, baseMaxX, "scaled max X should be greater than base max X");
    });

    it("stitchLength parameter affects stitch density (sanity)", async function () {
      // Short stitchLength => more stitches
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      window.p5embroidery.setStrokeSettings({ stitchLength: 1, minStitchLength: 0.1, resampleNoise: 0, strokeWeight: 0 });
      line(0, 0, 20, 0);
      window.endRecord();
      const dense = await exportJSONCaptured();
      const denseCount = dense.threads[0].runs[0].stitches.length;

      // Long stitchLength => fewer stitches
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      window.p5embroidery.setStrokeSettings({ stitchLength: 5, minStitchLength: 0.1, resampleNoise: 0, strokeWeight: 0 });
      line(0, 0, 20, 0);
      window.endRecord();
      const sparse = await exportJSONCaptured();
      const sparseCount = sparse.threads[0].runs[0].stitches.length;

      assert.isAbove(denseCount, sparseCount, "smaller stitchLength should produce more stitches");
    });

    it("setStrokeMode('zigzag') produces lateral deviation from a straight line", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();

      // Ensure a wide stroke so zigzag has visible amplitude
      window.p5embroidery.setStrokeSettings({ stitchLength: 2, minStitchLength: 0.1, resampleNoise: 0, strokeWeight: 4 });
      window.p5embroidery.setStrokeMode("zigzag");

      line(0, 0, 30, 0);
      window.endRecord();
      const obj = await exportJSONCaptured();

      const stitches = obj.threads[0].runs[0].stitches;
      const ys = stitches.map((s) => s.y);
      const ySpan = Math.max(...ys) - Math.min(...ys);
      assert.ok(ySpan > 0.5, "zigzag should introduce non-trivial Y span");
    });

    it("records stitches from basic drawing primitives (rect/ellipse/triangle/arc)", async function () {
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();

      rect(0, 0, 20, 10);
      ellipse(40, 10, 10, 10);
      triangle(70, 0, 80, 10, 60, 10);
      arc(110, 10, 10, 10, 0, PI);

      window.endRecord();
      const obj = await exportJSONCaptured();
      assert.isAtLeast(obj.threads[0].runs.length, 4, "expected at least one run per primitive");
    });

    it("drawMode 'realistic' behaves like 'stitch' for transform application (sanity)", async function () {
      // stitch mode baseline
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      window.p5embroidery.setDrawMode("stitch");
      translate(10, 0);
      line(0, 0, 10, 0);
      window.endRecord();
      const stitchObj = await exportJSONCaptured();
      const stitchFirst = firstStitch(stitchObj);

      // realistic mode should still apply transforms to recorded points
      window.beginRecord(window.__p5_instance);
      minimalStrokeSetup();
      window.p5embroidery.setDrawMode("realistic");
      translate(10, 0);
      line(0, 0, 10, 0);
      window.endRecord();
      const realisticObj = await exportJSONCaptured();
      const realisticFirst = firstStitch(realisticObj);

      assert.ok(
        Math.abs(realisticFirst.x - stitchFirst.x) < 0.001,
        "realistic mode should apply translate similarly to stitch mode",
      );
    });
  });
})();
