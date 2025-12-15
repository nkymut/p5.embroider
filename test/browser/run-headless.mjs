import { spawn } from "node:child_process";
import http from "node:http";
import process from "node:process";
import { chromium } from "playwright";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, server, timeoutMs = 15000) {
  const start = Date.now();
  while (true) {
    if (server.exitCode !== null) {
      throw new Error(`http-server exited early with code ${server.exitCode}`);
    }
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for server at ${url}`);
    await sleep(200);
  }
}

async function main() {
  const port = process.env.BROWSER_TEST_PORT || "8099";
  const url = `http://127.0.0.1:${port}/test/browser/index.html`;

  // Start static server (same as npm run test:browser, but headless-friendly)
  const server = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["http-server", ".", "-p", port, "-c-1", "--silent"],
    { stdio: "inherit" },
  );

  // Wait for server to be reachable
  await waitForServer(url, server, 20000);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (msg) => {
    // Forward browser console to node stdout (useful for debugging)
    const type = msg.type();
    const text = msg.text();
    // Filter noisy favicon errors etc if desired later; keep all for now.
    console.log(`[browser:${type}] ${text}`);
  });
  page.on("pageerror", (err) => {
    console.error(`[browser:pageerror] ${String(err?.stack || err)}`);
  });
  page.on("requestfailed", (req) => {
    console.error(`[browser:requestfailed] ${req.url()} ${req.failure()?.errorText || ""}`);
  });

  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });

    // Wait for the harness to finish and expose results
    await page.waitForFunction(() => window.__browserTestDone === true, { timeout: 60000 });
    const results = await page.evaluate(() => window.__browserTestResults);

    // Print a compact summary
    console.log("\n=== Browser test summary ===");
    console.log(JSON.stringify(results, null, 2));

    if (results?.stats?.failures > 0) {
      process.exitCode = 1;
    }
  } finally {
    await page.close();
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

