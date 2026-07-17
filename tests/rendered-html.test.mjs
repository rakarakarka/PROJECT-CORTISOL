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

test("server-renders the complete emotional experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Project Cortisol \| Emotional Matter Study<\/title>/i);
  assert.match(html, /An(?:\s|&nbsp;|\u00a0)interactive map of human tension/i);
  assert.match(html, /Stop to feel and select the image, or continue to scroll/i);
  assert.match(html, /We rarely feel just one emotion at a time/i);
  assert.match(html, /Bidirectional expectation and expression plane/i);
  assert.match(html, /Control the Mood Particle/i);
  assert.match(html, /Or click and drag around the space/i);
  assert.match(html, /Expectation axis.*disappointment.*fulfillment/i);
  assert.match(html, /Expression axis.*serenity.*anger/i);
  assert.match(html, /Eight mood detail chapters/i);
  assert.match(html, /Euphoric Ecstasy/i);
  assert.match(html, /Boiling Tar/i);
  assert.match(html, /Somber Grace/i);
  assert.match(html, /Pristine Nirvana/i);
  assert.match(html, /The Fuse/i);
  assert.match(html, /The Limbo/i);
  assert.match(html, /The Stasis/i);
  assert.match(html, /The Horizon/i);
  assert.match(html, /Unexpressed emotions will never die/i);
  assert.match(html, /An interactive digital space designed to explore and visualize our combined emotional states/i);
  assert.match(html, /Arka Auzan/i);
  assert.equal((html.match(/class="mood-detail"/g) ?? []).length, 8);
  assert.equal((html.match(/type="range"[^>]*min="-1"[^>]*max="1"/gi) ?? []).length, 2);
  assert.match(html, /rel="icon"[^>]*href="\/favicon\.svg"/i);
  assert.doesNotMatch(html, /Sol 5\.6/i);
  assert.doesNotMatch(html, /autonomic|stochastic|neural matter ingestion/i);
});

test("keeps the particle and continuous choreography contracts explicit", async () => {
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
  assert.match(model, /GLOBAL_PARTICLE_CAP = 18_000/);
  assert.match(model, /PRELOADER_PARTICLE_COUNT = 30_000/);
  assert.match(model, /AXIS_TOLERANCE = 0\.05/);
  assert.match(model, /currentStage: "SANDBOX" \| "CLUSTER_ASSEMBLY" \| "DETAIL_SEQUENCE"/);
  assert.match(model, /lerp: 0\.075/);
  assert.match(model, /wheelMultiplier: 0\.8/);

  assert.match(profiles, /STATE_PROFILES: MoodProfile\[\]/);
  assert.equal((profiles.match(/quadrant: "(?:I|II|III|IV|AXIS_TOP|AXIS_LEFT|AXIS_BOTTOM|AXIS_RIGHT)"/g) ?? []).length, 8);
  assert.equal((profiles.match(/imageAssetPath: "\/assets\/images\/image_0[1-8]_[^"]+\.jpg"/g) ?? []).length, 8);
  assert.match(profiles, /velocityMax: 12/);
  assert.doesNotMatch(profiles, /isCagedSwarm/);
  assert.match(profiles, /function bilinear/);
  assert.match(profiles, /samplePhysics/);

  assert.match(renderer, /GPUComputationRenderer/);
  assert.match(renderer, /AfterimagePass/);
  assert.match(renderer, /HalfFloatType/);
  assert.match(renderer, /AdditiveBlending/);
  assert.match(renderer, /depthTest: false/);
  assert.match(renderer, /const computeSize = 176/);
  assert.match(renderer, /PRELOADER_PARTICLE_COUNT/);
  assert.match(renderer, /GLOBAL_PARTICLE_CAP/);
  assert.match(renderer, /uVelocityTexture/);
  assert.match(renderer, /uScrollVelocity/);
  assert.match(renderer, /createBiologicalSphereTexture/);
  assert.match(renderer, /controlledVelocityMax = Math\.min\(physics\.velocityMax, 5\.4\)/);
  assert.match(renderer, /PARTICLE_BOUNDARY_RADIUS = 2\.54 \* 1\.2/);
  assert.doesNotMatch(renderer, /cageBounds|uCageBounds|uIsCagedSwarm/);

  assert.doesNotMatch(shaders, /uIsCagedSwarm|uCageBounds|distanceFromOrigin/);
  assert.doesNotMatch(shaders, /loadingSpiral/);
  assert.match(shaders, /exp\(-0\.05/);
  assert.match(shaders, /loadingVortex/);
  assert.match(shaders, /membraneWave/);
  assert.match(shaders, /regenerationProgress/);
  assert.match(shaders, /boundaryInfluence/);
  assert.match(shaders, /soundWaveBoundary/);
  assert.match(shaders, /boundaryEcho/);
  assert.match(shaders, /regenerationThreadLength/);
  assert.match(shaders, /curlField/);
  assert.match(shaders, /generativeFlow/);
  assert.match(shaders, /uVelocityTexture/);
  assert.match(shaders, /20\.0/);
  assert.match(shaders, /4\.5/);
  assert.match(shaders, /1\.2/);
  assert.match(shaders, /0\.035/);

  assert.match(experience, /new Lenis/);
  assert.match(experience, /SplitText/);
  assert.match(experience, /pin: true/);
  assert.match(experience, /end: "\+=260%"/);
  assert.match(experience, /progress < 0\.24/);
  assert.match(experience, /currentStage: "DETAIL_SEQUENCE"/);
  assert.match(experience, /moodSectionId/);
  assert.match(experience, /mood-detail__image/);
  assert.match(experience, /quote-motion-copy/);
  assert.match(experience, /about-motion-copy/);
  assert.match(experience, /layout\.depth \* \(1 - eased\)/);
  assert.match(experience, /mood-tile__surface/);
  assert.match(experience, /--float-duration/);
  assert.match(experience, /cluster-motion-copy/);
  assert.match(experience, /type: "words,chars"/);
  assert.match(experience, /wordsClass: "cluster-prompt-word"/);
  assert.match(experience, /characterProgress/);
  assert.match(experience, /clusterProgress - index \* 0\.009/);
  assert.doesNotMatch(experience, /layout\.rotate/);
  assert.match(experience, /selectMood/);
  assert.match(experience, /Math\.abs\(distance\) > 48/);
  assert.doesNotMatch(experience, /className="focus-stage"/);
  assert.match(experience, /requestAnimationFrame\(frame\)/);
  assert.match(experience, /prefers-reduced-motion: reduce/);

  assert.match(css, /repeat\(12, 1fr\)/);
  assert.match(css, /rgba\(255, 255, 255, 0\.08\)/);
  assert.match(css, /aspect-ratio: 1/);
  assert.match(css, /grid-column: 2 \/ span 5/);
  assert.match(css, /grid-column: 7 \/ span 5/);
  assert.match(css, /\.mood-control-panel/);
  assert.match(css, /\.homepage-edge-glow/);
  assert.match(css, /--mood-glow-a/);
  assert.match(css, /@keyframes moodTileFloat/);
  assert.match(css, /\.cluster-heading \{[\s\S]*?top: 50%/);
  assert.match(css, /\.cluster-prompt-char/);
  assert.match(css, /\.cluster-prompt-word/);
  assert.doesNotMatch(css, /rotate\(var\(--cluster-rotate\)\)/);
  assert.match(css, /\.mood-details/);
  assert.match(css, /\.mood-detail__editorial/);
  assert.match(css, /\[data-stage="DETAIL_SEQUENCE"\] \.cluster-stage/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  assert.match(page, /<CortisolExperience \/>/);
  assert.match(layout, /from "@vercel\/analytics\/next"/);
  assert.match(layout, /<Analytics \/>/);
  assert.match(layout, /import \{ Andika \} from "next\/font\/google"/);
  assert.match(layout, /weight: \["400", "700"\]/);
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
