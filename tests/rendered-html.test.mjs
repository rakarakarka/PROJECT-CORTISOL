import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the revised Project Cortisol experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Project Cortisol \| Emotional Matter Study<\/title>/i);
  assert.match(html, /Project Cortisol eight-state emotional coordinate field/i);
  assert.match(html, /Bidirectional expectation and expression plane/i);
  assert.match(html, /Biological Idle/i);
  assert.match(html, /Eight representative somatic systems/i);
  assert.match(html, /Euphoric Ecstasy/i);
  assert.match(html, /Boiling Tar/i);
  assert.match(html, /Somber Grace/i);
  assert.match(html, /Pristine Nirvana/i);
  assert.match(html, /The Fuse/i);
  assert.match(html, /The Limbo/i);
  assert.match(html, /The Stasis/i);
  assert.match(html, /The Horizon/i);
  assert.match(html, /type="range"[^>]*min="-1"[^>]*max="1"/i);
  assert.match(html, /rel="icon"[^>]*href="\/favicon\.svg"/i);
  assert.doesNotMatch(html, /codex-preview|loading skeleton|Your site is taking shape/i);
});

test("keeps the WebGL, state, magnetism, and scroll contracts explicit", async () => {
  const [experience, model, profiles, renderer, shaders, css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/CortisolExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cortisol/model.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cortisol/profiles.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cortisol/WebGLCortisol.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/cortisol/shaders.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(model, /AXIS_TOLERANCE = 0\.05/);
  assert.match(model, /lerp: 0\.075/);
  assert.match(model, /wheelMultiplier: 0\.8/);
  assert.match(model, /interface ProjectCortisolState/);
  assert.match(profiles, /STATE_PROFILES: StateProfile\[\]/);
  assert.equal((profiles.match(/quadrant: "(?:I|II|III|IV|TOP_AXIS|LEFT_AXIS|BOTTOM_AXIS|RIGHT_AXIS)"/g) ?? []).length, 8);
  assert.match(profiles, /function bilinear/);
  assert.match(profiles, /samplePhysics/);

  assert.match(renderer, /GPUComputationRenderer/);
  assert.match(renderer, /AfterimagePass/);
  assert.match(renderer, /HalfFloatType/);
  assert.match(renderer, /AdditiveBlending/);
  assert.match(renderer, /depthTest: false/);
  assert.match(renderer, /createTorusKnotTexture/);
  assert.match(shaders, /uOriginTexture/);
  assert.match(shaders, /4\.5/);
  assert.match(shaders, /curlField/);
  assert.match(shaders, /1\.2/);
  assert.match(shaders, /0\.035/);
  assert.match(shaders, /uScrollVelocity \* 0\.06/);
  assert.match(shaders, /uScrollVelocity \* 0\.025/);
  assert.match(shaders, /\* 0\.07/);

  assert.match(experience, /new Lenis/);
  assert.match(experience, /ScrollTrigger/);
  assert.match(experience, /requestAnimationFrame\(frame\)/);
  assert.match(experience, /prefers-reduced-motion: reduce/);
  assert.match(experience, /field-cursor--/);
  assert.match(css, /repeat\(12, 1fr\)/);
  assert.match(css, /rgba\(255, 255, 255, 0\.08\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  assert.match(page, /<CortisolExperience \/>/);
  assert.match(layout, /from "@vercel\/analytics\/next"/);
  assert.match(layout, /<Analytics \/>/);
  assert.match(packageJson, /"three"/);
  assert.match(packageJson, /"lenis"/);
  assert.match(packageJson, /"gsap"/);
  assert.match(packageJson, /"lucide-react"/);
  assert.match(packageJson, /"build": "next build"/);
  assert.match(packageJson, /"build:sites": "vinext build"/);

  const previewFiles = await readdir(new URL("../app/_sites-preview", import.meta.url));
  assert.deepEqual(previewFiles, []);
});
