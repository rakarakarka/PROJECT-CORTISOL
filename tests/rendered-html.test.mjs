import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
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

test("server-renders the Sol 5.6 emotional experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Project Cortisol \| Emotional Matter Study<\/title>/i);
  assert.match(html, /An interactive map of human tension/i);
  assert.match(html, /We rarely feel just one emotion at a time/i);
  assert.match(html, /Bidirectional expectation and expression plane/i);
  assert.match(html, /Expectation axis.*disappointment.*fulfillment/i);
  assert.match(html, /Expression axis.*serenity.*anger/i);
  assert.match(html, /The blurred intersections/i);
  assert.match(html, /Euphoric Ecstasy/i);
  assert.match(html, /Boiling Tar/i);
  assert.match(html, /Somber Grace/i);
  assert.match(html, /Pristine Nirvana/i);
  assert.match(html, /The Fuse/i);
  assert.match(html, /The Limbo/i);
  assert.match(html, /The Stasis/i);
  assert.match(html, /The Horizon/i);
  assert.equal((html.match(/type="range"[^>]*min="-1"[^>]*max="1"/gi) ?? []).length, 2);
  assert.match(html, /rel="icon"[^>]*href="\/favicon\.svg"/i);
  assert.doesNotMatch(html, /autonomic|stochastic|neural matter ingestion/i);
});

test("keeps the Sol 5.6 state, particle, and choreography contracts explicit", async () => {
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

  assert.match(model, /interface MoodProfile/);
  assert.match(model, /interface ProjectCortisolGlobalState/);
  assert.match(model, /GLOBAL_PARTICLE_CAP = 15_000/);
  assert.match(model, /PRELOADER_PARTICLE_COUNT = 25_000/);
  assert.match(model, /AXIS_TOLERANCE = 0\.05/);
  assert.match(model, /currentStage: "SANDBOX" \| "CLUSTER_ASSEMBLY" \| "SINGLE_FOCUS"/);
  assert.match(model, /lerp: 0\.075/);
  assert.match(model, /wheelMultiplier: 0\.8/);

  assert.match(profiles, /STATE_PROFILES: MoodProfile\[\]/);
  assert.equal((profiles.match(/quadrant: "(?:I|II|III|IV|AXIS_TOP|AXIS_LEFT|AXIS_BOTTOM|AXIS_RIGHT)"/g) ?? []).length, 8);
  assert.equal((profiles.match(/imageAssetPath: "\/assets\/images\/image_0[1-8]_[^"]+\.jpg"/g) ?? []).length, 8);
  assert.match(profiles, /velocityMax: 12/);
  assert.match(profiles, /isCagedSwarm: true/);
  assert.match(profiles, /function bilinear/);
  assert.match(profiles, /samplePhysics/);

  assert.match(renderer, /GPUComputationRenderer/);
  assert.match(renderer, /AfterimagePass/);
  assert.match(renderer, /HalfFloatType/);
  assert.match(renderer, /AdditiveBlending/);
  assert.match(renderer, /depthTest: false/);
  assert.match(renderer, /const computeSize = 160/);
  assert.match(renderer, /PRELOADER_PARTICLE_COUNT/);
  assert.match(renderer, /GLOBAL_PARTICLE_CAP/);
  assert.match(renderer, /pixelRadius = Math\.min\(400/);

  assert.match(shaders, /uIsCagedSwarm/);
  assert.match(shaders, /uCageBounds/);
  assert.match(shaders, /velocity\.x \*= -0\.96/);
  assert.match(shaders, /exp\(-0\.05/);
  assert.match(shaders, /particleIndex \/ 25000\.0/);
  assert.match(shaders, /curlField/);
  assert.match(shaders, /4\.5/);
  assert.match(shaders, /1\.2/);
  assert.match(shaders, /0\.035/);

  assert.match(experience, /new Lenis/);
  assert.match(experience, /SplitText/);
  assert.match(experience, /pin: true/);
  assert.match(experience, /progress < 0\.25/);
  assert.match(experience, /progress < 0\.6/);
  assert.match(experience, /selectMood/);
  assert.match(experience, /Math\.abs\(distance\) > 48/);
  assert.match(experience, /requestAnimationFrame\(frame\)/);
  assert.match(experience, /prefers-reduced-motion: reduce/);

  assert.match(css, /repeat\(12, 1fr\)/);
  assert.match(css, /rgba\(255, 255, 255, 0\.08\)/);
  assert.match(css, /aspect-ratio: 1/);
  assert.match(css, /grid-column: 2 \/ span 5/);
  assert.match(css, /grid-column: 7 \/ span 5/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  assert.match(page, /<CortisolExperience \/>/);
  assert.match(layout, /from "@vercel\/analytics\/next"/);
  assert.match(layout, /<Analytics \/>/);
  assert.match(packageJson, /"three"/);
  assert.match(packageJson, /"lenis"/);
  assert.match(packageJson, /"gsap"/);
  assert.match(packageJson, /"build:sites": "vinext build"/);

  const previewFiles = await readdir(new URL("../app/_sites-preview", import.meta.url));
  assert.deepEqual(previewFiles, []);
});

test("ships eight square compressed mood images", async () => {
  const expected = [
    "image_01_triumph.jpg",
    "image_02_resentment.jpg",
    "image_03_melancholy.jpg",
    "image_04_stillness.jpg",
    "image_05_volatility.jpg",
    "image_06_numbness.jpg",
    "image_07_stasis.jpg",
    "image_08_relief.jpg",
  ];
  for (const filename of expected) {
    const info = await stat(new URL(`../public/assets/images/${filename}`, import.meta.url));
    assert.ok(info.size > 20_000, `${filename} should contain a real compressed image`);
    assert.ok(info.size < 1_500_000, `${filename} should remain web-compressed`);
  }
});
