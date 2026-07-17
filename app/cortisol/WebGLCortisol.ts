import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GLOBAL_PARTICLE_CAP, PRELOADER_PARTICLE_COUNT, type ProjectCortisolGlobalState } from "./model";
import { MOOD_VISUALS, resolveProfile, samplePhysics } from "./profiles";
import {
  PARTICLE_FRAGMENT_SHADER,
  PARTICLE_VERTEX_SHADER,
  POSITION_SHADER,
  VELOCITY_SHADER,
} from "./shaders";

type ComputeVariable = ReturnType<GPUComputationRenderer["addVariable"]>;

const CLOCK_EPSILON = 0.0001;

function smoothstep(min: number, max: number, value: number) {
  const normalized = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return normalized * normalized * (3 - 2 * normalized);
}

function createTorusKnotTexture(gpu: GPUComputationRenderer, size: number) {
  const texture = gpu.createTexture();
  const data = texture.image.data as Float32Array;
  const count = size * size;
  for (let index = 0; index < count; index += 1) {
    const t = (index / count) * Math.PI * 2;
    const p = 2;
    const q = 3;
    const tubeAngle = ((index * 0.61803398875) % 1) * Math.PI * 2;
    const radius = 1.62 + 0.34 * Math.cos(q * t) + 0.16 * Math.cos(tubeAngle);
    const offset = index * 4;
    data[offset] = radius * Math.cos(p * t) + 0.22 * Math.cos(tubeAngle) * Math.cos(p * t);
    data[offset + 1] = radius * Math.sin(p * t) + 0.22 * Math.cos(tubeAngle) * Math.sin(p * t);
    data[offset + 2] = 0.72 * Math.sin(q * t) + 0.22 * Math.sin(tubeAngle);
    data[offset + 3] = index / count;
  }
  texture.needsUpdate = true;
  return texture;
}

function createVelocityTexture(gpu: GPUComputationRenderer) {
  const texture = gpu.createTexture();
  (texture.image.data as Float32Array).fill(0);
  texture.needsUpdate = true;
  return texture;
}

export class WebGLCortisol {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
  private gpu: GPUComputationRenderer;
  private positionVariable: ComputeVariable;
  private velocityVariable: ComputeVariable;
  private particleMaterial: THREE.ShaderMaterial;
  private particles: THREE.Points;
  private composer: EffectComposer;
  private afterimagePass: AfterimagePass;
  private failed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = true;
    this.camera.position.z = 7;

    const computeSize = 176;
    this.gpu = new GPUComputationRenderer(computeSize, computeSize, this.renderer);
    this.gpu.setDataType(THREE.HalfFloatType);
    const originTexture = createTorusKnotTexture(this.gpu, computeSize);
    const velocityTexture = createVelocityTexture(this.gpu);
    this.positionVariable = this.gpu.addVariable("texturePosition", POSITION_SHADER, originTexture.clone());
    this.velocityVariable = this.gpu.addVariable("textureVelocity", VELOCITY_SHADER, velocityTexture);
    this.gpu.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);
    this.gpu.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);

    this.positionVariable.material.uniforms.uDelta = { value: 1 / 60 };
    Object.assign(this.velocityVariable.material.uniforms, {
      uOriginTexture: { value: originTexture },
      uTime: { value: 0 },
      uDelta: { value: 1 / 60 },
      uCoordinates: { value: new THREE.Vector2() },
      uVelocityMax: { value: 0.72 },
      uViscosity: { value: 0.18 },
      uGravity: { value: 0 },
      uDamping: { value: 0.08 },
      uNoiseFrequency: { value: 0.06 },
      uEntropy: { value: 0.025 },
      uScrollProgress: { value: 0 },
      uScrollVelocity: { value: 0 },
    });

    const initError = this.gpu.init();
    if (initError) {
      this.failed = true;
      throw new Error(initError);
    }

    const geometry = new THREE.BufferGeometry();
    const count = PRELOADER_PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const references = new Float32Array(count * 2);
    const particleIndices = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      references[index * 2] = (index % computeSize + 0.5) / computeSize;
      references[index * 2 + 1] = (Math.floor(index / computeSize) + 0.5) / computeSize;
      particleIndices[index] = index;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(references, 2));
    geometry.setAttribute("particleIndex", new THREE.BufferAttribute(particleIndices, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uTime: { value: 0 },
        uLoadPhase: { value: 0 },
        uScrollProgress: { value: 0 },
        uPointScale: { value: Math.min(window.devicePixelRatio || 1, 1.5) * 11 },
        uCoordinates: { value: new THREE.Vector2() },
        uActiveParticleCount: { value: PRELOADER_PARTICLE_COUNT },
        uColorA: { value: new THREE.Color(0xf7fcff) },
        uColorB: { value: new THREE.Color(0x567de8) },
        uOpacity: { value: 1 },
      },
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.afterimagePass = new AfterimagePass(0.84);
    this.composer.addPass(this.afterimagePass);
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.particleMaterial.uniforms.uPointScale.value = Math.min(window.devicePixelRatio || 1, 1.5) * 11;
  }

  render(
    state: ProjectCortisolGlobalState,
    delta: number,
    elapsed: number,
    scrollProgress: number,
    scrollVelocity: number,
    loadPhase: number,
  ) {
    if (this.failed) return;
    const step = Math.min(0.034, Math.max(CLOCK_EPSILON, delta));
    const { x, y } = state.inputCoordinates;
    const physics = samplePhysics(x, y);
    const velocityUniforms = this.velocityVariable.material.uniforms;
    this.positionVariable.material.uniforms.uDelta.value = step;
    velocityUniforms.uTime.value = elapsed;
    velocityUniforms.uDelta.value = step;
    velocityUniforms.uCoordinates.value.set(x, y);
    velocityUniforms.uVelocityMax.value += (physics.velocityMax - velocityUniforms.uVelocityMax.value) * 0.055;
    velocityUniforms.uViscosity.value += (physics.viscosity - velocityUniforms.uViscosity.value) * 0.055;
    velocityUniforms.uGravity.value += (physics.gravity - velocityUniforms.uGravity.value) * 0.055;
    velocityUniforms.uDamping.value += (physics.damping - velocityUniforms.uDamping.value) * 0.055;
    velocityUniforms.uNoiseFrequency.value += (physics.curlNoiseFrequency - velocityUniforms.uNoiseFrequency.value) * 0.055;
    const targetEntropy = 0.025 + Math.max(y, 0) * 0.55 + Math.max(y, 0) * Math.max(-x, 0) * 0.2;
    velocityUniforms.uEntropy.value += (targetEntropy - velocityUniforms.uEntropy.value) * 0.055;
    velocityUniforms.uScrollProgress.value = scrollProgress;
    velocityUniforms.uScrollVelocity.value = THREE.MathUtils.clamp(scrollVelocity, -20, 20);
    this.gpu.compute();

    const active = resolveProfile(x, y);
    const visual = MOOD_VISUALS[active.id];
    const particleUniforms = this.particleMaterial.uniforms;
    particleUniforms.uPositionTexture.value = this.gpu.getCurrentRenderTarget(this.positionVariable).texture;
    particleUniforms.uVelocityTexture.value = this.gpu.getCurrentRenderTarget(this.velocityVariable).texture;
    particleUniforms.uTime.value = elapsed;
    particleUniforms.uLoadPhase.value = loadPhase;
    particleUniforms.uScrollProgress.value = scrollProgress;
    particleUniforms.uCoordinates.value.set(x, y);
    particleUniforms.uActiveParticleCount.value = loadPhase < 1 ? PRELOADER_PARTICLE_COUNT : GLOBAL_PARTICLE_CAP;
    particleUniforms.uColorA.value.setRGB(...visual.colorA);
    particleUniforms.uColorB.value.setRGB(...visual.colorB);
    particleUniforms.uOpacity.value = 1 - smoothstep(0.18, 0.32, scrollProgress) * 0.7 - smoothstep(0.32, 0.48, scrollProgress) * 0.18;

    const disappointment = Math.max(-x, 0);
    this.afterimagePass.uniforms.damp.value = 0.84 + disappointment * 0.08;
    this.composer.render();
  }

  dispose() {
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
