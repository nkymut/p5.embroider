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
  });
})();
