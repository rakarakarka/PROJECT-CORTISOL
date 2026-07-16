import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Project Cortisol experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Project Cortisol \| Emotional Matter Study<\/title>/i);
  assert.match(html, /Project Cortisol emotional blend field/i);
  assert.match(html, /<canvas[^>]*aria-hidden="true"/i);
  assert.match(html, /The Calm/i);
  assert.match(html, /aria-label="Emotional controls"/i);
  assert.match(html, /type="range"[^>]*value="0\.28"/i);
  assert.match(html, /type="range"[^>]*value="0\.22"/i);
  assert.match(html, /rel="icon"[^>]*href="\/favicon\.svg"/i);
  assert.match(html, /rel="shortcut icon"[^>]*href="\/favicon\.svg"/i);
  assert.match(
    html,
    /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i,
  );
  assert.doesNotMatch(html, /codex-preview|loading skeleton|Your site is taking shape/i);
});

test("keeps the simulation deterministic and the starter disposable", async () => {
  const [experience, css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/CortisolExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(experience, /const FIXED_STEP = 1 \/ 60/);
  assert.match(experience, /function mulberry32/);
  assert.match(experience, /new Float32Array/);
  assert.match(experience, /trailHead: new Uint8Array/);
  assert.match(experience, /requestAnimationFrame\(frame\)/);
  assert.match(experience, /function cornerWeights/);
  assert.match(experience, /prefers-reduced-motion: reduce/);

  assert.match(css, /@media \(max-width: 840px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(page, /<CortisolExperience \/>/);
  assert.match(layout, /Project Cortisol \| Emotional Matter Study/);
  assert.match(layout, /\/og\.png/);
  assert.match(packageJson, /"build": "next build"/);
  assert.match(packageJson, /"build:sites": "vinext build"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  const previewFiles = await readdir(
    new URL("../app/_sites-preview", import.meta.url),
  );
  assert.deepEqual(previewFiles, []);
});
