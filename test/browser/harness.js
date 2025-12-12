// Browser harness for p5.embroider sanity tests
// - Creates a global-mode p5 instance so p5 functions exist on window (line, rect, translate, ...)
// - Provides helpers to capture export blobs (JSON/SVG/etc) without downloading

(function () {
  // --- Minimal assertion helpers (avoid external deps like chai) ---
  window.__assert = {
    ok(cond, msg) {
      if (!cond) throw new Error(msg || "assertion failed");
    },
    equal(a, b, msg) {
      if (a != b) throw new Error(msg || `expected ${a} == ${b}`);
    },
    strictEqual(a, b, msg) {
      if (a !== b) throw new Error(msg || `expected ${a} === ${b}`);
    },
    notStrictEqual(a, b, msg) {
      if (a === b) throw new Error(msg || `expected ${a} !== ${b}`);
    },
    isFunction(v, msg) {
      if (typeof v !== "function") throw new Error(msg || `expected function, got ${typeof v}`);
    },
    isObject(v, msg) {
      if (v === null || typeof v !== "object") throw new Error(msg || `expected object, got ${typeof v}`);
    },
    isArray(v, msg) {
      if (!Array.isArray(v)) throw new Error(msg || "expected array");
    },
    isAtLeast(n, min, msg) {
      if (!(n >= min)) throw new Error(msg || `expected ${n} >= ${min}`);
    },
    isAbove(n, min, msg) {
      if (!(n > min)) throw new Error(msg || `expected ${n} > ${min}`);
    },
  };

  // --- p5 global-mode bootstrap ---
  window.__p5_ready = false;
  window.setup = function () {
    // In p5 global mode, `this` is the p5 instance created by p5 itself.
    window.__p5_instance = this;
    const mount = document.getElementById("sketch-mount");
    const c = createCanvas(200, 120);
    if (mount && c && c.elt) mount.appendChild(c.elt);
    background(255);
    noLoop();
    window.__p5_ready = true;
  };

  window.__waitForP5Ready = async function () {
    const start = Date.now();
    while (!window.__p5_ready) {
      if (Date.now() - start > 10000) throw new Error("Timed out waiting for p5 setup()");
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  // --- Blob capture helper ---
  window.__withCapturedBlob = async function (fn) {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;

    let captured = null;

    URL.createObjectURL = function (blob) {
      captured = blob;
      // Return a harmless placeholder URL
      return "blob:captured";
    };

    URL.revokeObjectURL = function () {
      // no-op
    };

    HTMLAnchorElement.prototype.click = function () {
      // no-op (prevent navigation / download)
    };

    try {
      await fn();
      if (!captured) throw new Error("No Blob captured (did export run?)");
      return captured;
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  };

  // --- Mocha results export (single place to copy/save results) ---
  window.__runMochaAndExposeResults = function () {
    const assert = window.__assert;
    assert.isFunction(mocha.run, "mocha.run should exist");

    const resultsElId = "test-results";
    let resultsEl = document.getElementById(resultsElId);
    if (!resultsEl) {
      resultsEl = document.createElement("pre");
      resultsEl.id = resultsElId;
      resultsEl.style.whiteSpace = "pre-wrap";
      resultsEl.style.marginTop = "12px";
      resultsEl.style.padding = "12px";
      resultsEl.style.border = "1px solid #ddd";
      resultsEl.style.background = "#fafafa";
      resultsEl.textContent = "Running…";
      document.body.appendChild(resultsEl);
    }

    const runner = mocha.run();
    const stats = { passes: 0, failures: 0, pending: 0, start: Date.now(), end: null, durationMs: null };
    const failures = [];

    runner.on("pass", () => (stats.passes += 1));
    runner.on("pending", () => (stats.pending += 1));
    runner.on("fail", (test, err) => {
      stats.failures += 1;
      failures.push({
        fullTitle: typeof test?.fullTitle === "function" ? test.fullTitle() : String(test?.title || "unknown"),
        message: String(err?.message || err || "error"),
        stack: String(err?.stack || ""),
      });
    });

    runner.on("end", () => {
      stats.end = Date.now();
      stats.durationMs = stats.end - stats.start;
      const summary = { stats, failures };
      window.__browserTestResults = summary;
      resultsEl.textContent = JSON.stringify(summary, null, 2);

      // Optional: provide a download link for the results JSON
      let link = document.getElementById("test-results-download");
      if (!link) {
        link = document.createElement("a");
        link.id = "test-results-download";
        link.style.display = "inline-block";
        link.style.marginTop = "8px";
        link.textContent = "Download results JSON";
        document.body.appendChild(link);
      }
      const blob = new Blob([resultsEl.textContent], { type: "application/json" });
      link.href = URL.createObjectURL(blob);
      link.download = "browser-test-results.json";
    });
  };
})();
