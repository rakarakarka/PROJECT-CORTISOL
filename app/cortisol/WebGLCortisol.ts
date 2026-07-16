import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import type { ProjectCortisolState } from "./model";
import { ORIGIN_PROFILE, STATE_PROFILES } from "./profiles";
import {
  ARTWORK_FRAGMENT_SHADER,
  ARTWORK_VERTEX_SHADER,
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
  private artworkPlanes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private dimensions = { width: 1, height: 1 };
  private failed = false;

  constructor(canvas: HTMLCanvasElement, reducedMotion: boolean) {
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

    const computeSize = reducedMotion || window.innerWidth < 720 ? 128 : 256;
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
    });

    const initError = this.gpu.init();
    if (initError) {
      this.failed = true;
      throw new Error(initError);
    }

    const geometry = new THREE.BufferGeometry();
    const count = computeSize * computeSize;
    const positions = new Float32Array(count * 3);
    const references = new Float32Array(count * 2);
    for (let index = 0; index < count; index += 1) {
      references[index * 2] = (index % computeSize + 0.5) / computeSize;
      references[index * 2 + 1] = (Math.floor(index / computeSize) + 0.5) / computeSize;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(references, 2));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPositionTexture: { value: null },
        uTime: { value: 0 },
        uLoadPhase: { value: 0 },
        uScrollProgress: { value: 0 },
        uPointScale: { value: Math.min(window.devicePixelRatio || 1, 1.5) * 11 },
        uCoordinates: { value: new THREE.Vector2() },
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
    this.afterimagePass = new AfterimagePass(0.88);
    this.composer.addPass(this.afterimagePass);

    new THREE.TextureLoader().load("/og.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      this.createArtworkPlanes(texture);
    });
  }

  private createArtworkPlanes(texture: THREE.Texture) {
    const geometry = new THREE.PlaneGeometry(2.72, 1.43, 42, 18);
    STATE_PROFILES.forEach((_, index) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uArtworkTexture: { value: texture },
          uScrollVelocity: { value: 0 },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uIndex: { value: index },
        },
        vertexShader: ARTWORK_VERTEX_SHADER,
        fragmentShader: ARTWORK_FRAGMENT_SHADER,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(geometry, material);
      plane.renderOrder = 2 + index;
      this.artworkPlanes.push(plane);
      this.scene.add(plane);
    });
  }

  resize(width: number, height: number) {
    this.dimensions = { width, height };
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.particleMaterial.uniforms.uPointScale.value = Math.min(window.devicePixelRatio || 1, 1.5) * 11;
  }

  render(
    state: ProjectCortisolState,
    delta: number,
    elapsed: number,
    scrollProgress: number,
    scrollVelocity: number,
    loadPhase: number,
  ) {
    if (this.failed) return;
    const step = Math.min(0.034, Math.max(CLOCK_EPSILON, delta));
    const physics = state.engineConstants;
    const velocityUniforms = this.velocityVariable.material.uniforms;
    this.positionVariable.material.uniforms.uDelta.value = step;
    velocityUniforms.uTime.value = elapsed;
    velocityUniforms.uDelta.value = step;
    velocityUniforms.uCoordinates.value.set(state.coordinates.x, state.coordinates.y);
    velocityUniforms.uVelocityMax.value += (physics.velocityMax - velocityUniforms.uVelocityMax.value) * 0.055;
    velocityUniforms.uViscosity.value += (physics.viscosity - velocityUniforms.uViscosity.value) * 0.055;
    velocityUniforms.uGravity.value += (physics.gravityField - velocityUniforms.uGravity.value) * 0.055;
    velocityUniforms.uDamping.value += (physics.dampingCoefficient - velocityUniforms.uDamping.value) * 0.055;
    velocityUniforms.uNoiseFrequency.value += (physics.noiseFrequency - velocityUniforms.uNoiseFrequency.value) * 0.055;
    velocityUniforms.uEntropy.value += (physics.entropyFactor - velocityUniforms.uEntropy.value) * 0.055;
    velocityUniforms.uScrollProgress.value = scrollProgress;
    this.gpu.compute();

    const profile = state.telemetryMetadata.cortisolIndexCode;
    const index = STATE_PROFILES.findIndex((item) => item.indexCode === profile);
    const active = index >= 0 ? STATE_PROFILES[index] : ORIGIN_PROFILE;
    const particleUniforms = this.particleMaterial.uniforms;
    particleUniforms.uPositionTexture.value = this.gpu.getCurrentRenderTarget(this.positionVariable).texture;
    particleUniforms.uTime.value = elapsed;
    particleUniforms.uLoadPhase.value = loadPhase;
    particleUniforms.uScrollProgress.value = scrollProgress;
    particleUniforms.uCoordinates.value.set(state.coordinates.x, state.coordinates.y);
    particleUniforms.uColorA.value.setRGB(...active.colorA);
    particleUniforms.uColorB.value.setRGB(...active.colorB);
    const galleryOpacity = smoothstep(0.18, 0.34, scrollProgress) * (1 - smoothstep(0.86, 0.97, scrollProgress));
    particleUniforms.uOpacity.value = 1 - galleryOpacity * 0.76;

    const widthFactor = this.dimensions.width / Math.max(1, this.dimensions.height);
    const scattered = scrollProgress < 0.3;
    const focusProgress = Math.min(0.999, Math.max(0, (scrollProgress - 0.2) / 0.68));
    const focusIndex = Math.floor(focusProgress * STATE_PROFILES.length);
    this.artworkPlanes.forEach((plane, planeIndex) => {
      const column = planeIndex % 2;
      const row = Math.floor(planeIndex / 2);
      const x = (column === 0 ? -1 : 1) * Math.min(3.25, 2.1 * widthFactor);
      const y = 4.0 - row * 2.65;
      const entrance = smoothstep(0.18 + planeIndex * 0.012, 0.44 + planeIndex * 0.012, scrollProgress);
      const isFocused = planeIndex === focusIndex;
      const targetX = scattered ? x : isFocused ? 0 : x * 1.65;
      const targetY = scattered ? y : isFocused ? 0 : y * 1.3;
      const targetZ = scattered ? -4.8 + entrance * 2.8 : isFocused ? -0.2 : -5.8;
      plane.position.x += (targetX - plane.position.x) * 0.08;
      plane.position.y += (targetY - plane.position.y) * 0.08;
      plane.position.z += (targetZ - plane.position.z) * 0.08;
      plane.rotation.z = (planeIndex % 2 ? -1 : 1) * 0.025 * Math.min(1, Math.abs(scrollVelocity));
      plane.material.uniforms.uTime.value = elapsed;
      plane.material.uniforms.uScrollVelocity.value = THREE.MathUtils.clamp(scrollVelocity * 0.12, -2.5, 2.5);
      plane.material.uniforms.uOpacity.value = galleryOpacity * (scattered ? 0.16 : isFocused ? 0.3 : 0.015) * entrance;
    });

    const disappointment = Math.max(-state.coordinates.x, 0);
    this.afterimagePass.uniforms.damp.value = 0.88 + disappointment * 0.07;
    this.composer.render();
  }

  dispose() {
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
    this.artworkPlanes.forEach((plane) => {
      plane.geometry.dispose();
      plane.material.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
