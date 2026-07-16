"use client";

import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type MoodPoint = { anger: number; disappointment: number };
type MoodKey = "calm" | "anger" | "disappointment" | "combined";
type RGB = [number, number, number];

type PhysicsProfile = {
  velocity: number;
  viscosity: number;
  gravity: number;
  damping: number;
  frequency: number;
  entropy: number;
  sharpness: number;
  primary: RGB;
  secondary: RGB;
};

type ParticleBuffers = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  phase: Float32Array;
  trailX: Float32Array;
  trailY: Float32Array;
  trailHead: Uint8Array;
};

const TRAIL_LENGTH = 10;
const FIXED_STEP = 1 / 60;

const PROFILES: Record<MoodKey, PhysicsProfile> = {
  calm: {
    velocity: 1.1,
    viscosity: 0.12,
    gravity: 0,
    damping: 0.035,
    frequency: 0.22,
    entropy: 0.12,
    sharpness: 0.15,
    primary: [126, 238, 192],
    secondary: [223, 255, 72],
  },
  anger: {
    velocity: 8.5,
    viscosity: 0.02,
    gravity: 0,
    damping: 0.02,
    frequency: 0.9,
    entropy: 0.95,
    sharpness: 0.96,
    primary: [255, 57, 22],
    secondary: [255, 226, 52],
  },
  disappointment: {
    velocity: 1.2,
    viscosity: 0.8,
    gravity: 9.8,
    damping: 0.15,
    frequency: 0.18,
    entropy: 0.12,
    sharpness: 0.24,
    primary: [83, 107, 178],
    secondary: [143, 175, 208],
  },
  combined: {
    velocity: 4.2,
    viscosity: 0.95,
    gravity: 4.5,
    damping: 0.1,
    frequency: 0.72,
    entropy: 0.75,
    sharpness: 0.9,
    primary: [190, 31, 77],
    secondary: [255, 111, 24],
  },
};

const STATE_COPY: Record<MoodKey, { label: string; description: string }> = {
  calm: {
    label: "The Calm",
    description: "Rhythmic focus. Low entropy, measured breath, a body held in equilibrium.",
  },
  anger: {
    label: "The Flashpoint",
    description: "Pure rage. Velocity escapes resistance and fractures the field into hot vectors.",
  },
  disappointment: {
    label: "The Sinkhole",
    description: "Pure despair. Momentum drains downward until the structure sags into silence.",
  },
  combined: {
    label: "Boiling Tar",
    description: "High resentment. Violent energy rises, catches, and collapses under its own weight.",
  },
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function cornerWeights(anger: number, disappointment: number) {
  return {
    calm: (1 - anger) * (1 - disappointment),
    anger: anger * (1 - disappointment),
    disappointment: (1 - anger) * disappointment,
    combined: anger * disappointment,
  };
}

function blendNumber(
  key: keyof Omit<PhysicsProfile, "primary" | "secondary">,
  anger: number,
  disappointment: number,
) {
  const weights = cornerWeights(anger, disappointment);
  return (
    PROFILES.calm[key] * weights.calm +
    PROFILES.anger[key] * weights.anger +
    PROFILES.disappointment[key] * weights.disappointment +
    PROFILES.combined[key] * weights.combined
  );
}

function blendColor(
  key: "primary" | "secondary",
  anger: number,
  disappointment: number,
): RGB {
  const weights = cornerWeights(anger, disappointment);
  return [0, 1, 2].map((index) =>
    Math.round(
      PROFILES.calm[key][index] * weights.calm +
        PROFILES.anger[key][index] * weights.anger +
        PROFILES.disappointment[key][index] * weights.disappointment +
        PROFILES.combined[key][index] * weights.combined,
    ),
  ) as RGB;
}

function getMoodKey({ anger, disappointment }: MoodPoint): MoodKey {
  if (anger >= 0.5 && disappointment >= 0.5) return "combined";
  if (anger >= 0.5) return "anger";
  if (disappointment >= 0.5) return "disappointment";
  return "calm";
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createParticles(count: number, width: number, height: number): ParticleBuffers {
  const random = mulberry32(0xc0771501);
  const buffers: ParticleBuffers = {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    ox: new Float32Array(count),
    oy: new Float32Array(count),
    phase: new Float32Array(count),
    trailX: new Float32Array(count * TRAIL_LENGTH),
    trailY: new Float32Array(count * TRAIL_LENGTH),
    trailHead: new Uint8Array(count),
  };

  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = 94 + random() * Math.max(100, height - 300);
    buffers.x[index] = x;
    buffers.y[index] = y;
    buffers.ox[index] = x;
    buffers.oy[index] = y;
    buffers.phase[index] = random() * Math.PI * 2;
    for (let trail = 0; trail < TRAIL_LENGTH; trail += 1) {
      const offset = index * TRAIL_LENGTH + trail;
      buffers.trailX[offset] = x;
      buffers.trailY[offset] = y;
    }
  }

  return buffers;
}

function rgb(color: RGB, alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

export function CortisolExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const moodRef = useRef<MoodPoint>({ anger: 0.28, disappointment: 0.22 });
  const pointerRef = useRef({ x: 0, y: 0, active: false, pulse: 0 });
  const pausedRef = useRef(false);
  const [mood, setMood] = useState<MoodPoint>(moodRef.current);
  const [paused, setPaused] = useState(false);

  const moodKey = getMoodKey(mood);
  const copy = STATE_COPY[moodKey];

  const commitMood = useCallback((next: MoodPoint) => {
    const normalized = {
      anger: clamp(next.anger),
      disappointment: clamp(next.disappointment),
    };
    moodRef.current = normalized;
    setMood(normalized);
  }, []);

  const updateFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const field = fieldRef.current;
      if (!field) return;
      const bounds = field.getBoundingClientRect();
      const x = clamp(event.clientX - bounds.left, 0, bounds.width);
      const y = clamp(event.clientY - bounds.top, 0, bounds.height);
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      commitMood({
        anger: 1 - y / bounds.height,
        disappointment: 1 - x / bounds.width,
      });
    },
    [commitMood],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current.active = true;
    pointerRef.current.pulse = 1;
    updateFromPointer(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || pointerRef.current.active) {
      updateFromPointer(event);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSlider =
    (key: keyof MoodPoint) => (event: ChangeEvent<HTMLInputElement>) => {
      commitMood({ ...moodRef.current, [key]: Number(event.target.value) });
    };

  const reset = () => {
    const next = { anger: 0.28, disappointment: 0.22 };
    commitMood(next);
    const bounds = fieldRef.current?.getBoundingClientRect();
    if (bounds) {
      pointerRef.current.x = bounds.width * (1 - next.disappointment);
      pointerRef.current.y = bounds.height * (1 - next.anger);
      pointerRef.current.pulse = 1;
    }
  };

  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 0.1 : 0.025;
      const current = moodRef.current;
      if (event.key === "ArrowUp") commitMood({ ...current, anger: current.anger + step });
      else if (event.key === "ArrowDown") commitMood({ ...current, anger: current.anger - step });
      else if (event.key === "ArrowLeft") {
        commitMood({ ...current, disappointment: current.disappointment + step });
      } else if (event.key === "ArrowRight") {
        commitMood({ ...current, disappointment: current.disappointment - step });
      } else return;
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commitMood]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    if (!canvas || !field) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let width = 1;
    let height = 1;
    let particles = createParticles(1, width, height);
    let animationFrame = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let elapsed = 0;
    let trailTick = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current = {
      velocity: PROFILES.calm.velocity,
      viscosity: PROFILES.calm.viscosity,
      gravity: PROFILES.calm.gravity,
      damping: PROFILES.calm.damping,
      frequency: PROFILES.calm.frequency,
      entropy: PROFILES.calm.entropy,
      sharpness: PROFILES.calm.sharpness,
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = reducedMotion ? 0.45 : 1;
      const count = Math.round(clamp((width * height) / 1550, 360, 980) * density);
      particles = createParticles(count, width, height);
      pointerRef.current.x = width * (1 - moodRef.current.disappointment);
      pointerRef.current.y = height * (1 - moodRef.current.anger);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(field);
    resize();

    const simulate = (dt: number) => {
      const target = moodRef.current;
      const ease = 1 - Math.exp(-dt * 3.2);
      for (const key of Object.keys(current) as Array<keyof typeof current>) {
        current[key] +=
          (blendNumber(key, target.anger, target.disappointment) - current[key]) * ease;
      }

      elapsed += dt;
      const pointer = pointerRef.current;
      pointer.pulse *= Math.exp(-dt * 2.6);
      const drag = Math.exp(-(current.viscosity * 5.2 + current.damping * 5) * dt);
      const speedLimit = current.velocity * 46;
      const sinkFloor = height - 182;

      for (let index = 0; index < particles.count; index += 1) {
        const phase = particles.phase[index];
        const x = particles.x[index];
        const y = particles.y[index];
        const breath = 14 + 24 * (1 - target.anger) * (1 - target.disappointment);
        const restX = particles.ox[index] + Math.sin(elapsed * 0.52 + phase) * breath;
        const restY = particles.oy[index] + Math.cos(elapsed * 0.43 + phase * 1.7) * breath * 0.7;
        const spring = 0.34 * (1 - target.disappointment) + 0.025;
        const fieldScale = 0.007 + current.frequency * 0.012;
        const energy = 20 + current.entropy * 165;
        let ax = (restX - x) * spring;
        let ay = (restY - y) * spring + current.gravity * 18;

        ax += Math.sin(y * fieldScale + elapsed * (0.8 + current.frequency * 3.2) + phase) * energy;
        ay += Math.cos(x * fieldScale - elapsed * (0.5 + current.frequency * 2.4) + phase) * energy;

        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const radius = 100 + target.anger * 150 + target.disappointment * 60;
        if (distance < radius) {
          const influence = (1 - distance / radius) * (0.12 + pointer.pulse);
          ax += (dx / distance) * influence * (120 + target.anger * 620);
          ay += (dy / distance) * influence * (120 + target.anger * 480);
        }

        const trappedBurst = Math.max(0, Math.sin(elapsed * 2.7 + phase * 7) - 0.94);
        ay -= trappedBurst * target.anger * target.disappointment * 2100;
        ax += Math.sin(phase * 11) * trappedBurst * target.anger * target.disappointment * 1300;

        let vx = (particles.vx[index] + ax * dt) * drag;
        let vy = (particles.vy[index] + ay * dt) * drag;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > speedLimit) {
          vx = (vx / speed) * speedLimit;
          vy = (vy / speed) * speedLimit;
        }

        let nextX = x + vx * dt;
        let nextY = y + vy * dt;
        if (nextX < -32) nextX = width + 31;
        if (nextX > width + 32) nextX = -31;
        if (nextY < 74) {
          nextY = 75;
          vy = Math.abs(vy) * 0.45;
        }
        if (nextY > sinkFloor + 42) {
          nextY = 92 + (phase / (Math.PI * 2)) * 80;
          nextX = (particles.ox[index] + elapsed * 19) % width;
          vy *= 0.1;
        }

        particles.vx[index] = vx;
        particles.vy[index] = vy;
        particles.x[index] = nextX;
        particles.y[index] = nextY;
      }

      trailTick += 1;
      if (trailTick % 2 === 0) {
        for (let index = 0; index < particles.count; index += 1) {
          const head = (particles.trailHead[index] + 1) % TRAIL_LENGTH;
          particles.trailHead[index] = head;
          const offset = index * TRAIL_LENGTH + head;
          particles.trailX[offset] = particles.x[index];
          particles.trailY[offset] = particles.y[index];
        }
      }
    };

    const render = () => {
      const target = moodRef.current;
      const primary = blendColor("primary", target.anger, target.disappointment);
      const secondary = blendColor("secondary", target.anger, target.disappointment);
      context.fillStyle = "#080909";
      context.fillRect(0, 0, width, height);

      context.lineWidth = 1;
      context.strokeStyle = "rgba(240, 242, 237, 0.055)";
      context.beginPath();
      context.moveTo(width * 0.5, 82);
      context.lineTo(width * 0.5, height - 176);
      context.moveTo(0, (height - 176) * 0.5);
      context.lineTo(width, (height - 176) * 0.5);
      context.stroke();

      for (let age = TRAIL_LENGTH - 1; age > 0; age -= 1) {
        const alpha = Math.exp(-age * (0.27 + target.disappointment * 0.08)) *
          (0.08 + target.disappointment * 0.18 + target.anger * 0.08);
        context.beginPath();
        for (let index = 0; index < particles.count; index += 1) {
          const head = particles.trailHead[index];
          const from = index * TRAIL_LENGTH + ((head - age + TRAIL_LENGTH) % TRAIL_LENGTH);
          const to = index * TRAIL_LENGTH + ((head - age + 1 + TRAIL_LENGTH) % TRAIL_LENGTH);
          const dx = Math.abs(particles.trailX[from] - particles.trailX[to]);
          if (dx < width * 0.5) {
            context.moveTo(particles.trailX[from], particles.trailY[from]);
            context.lineTo(particles.trailX[to], particles.trailY[to]);
          }
        }
        context.strokeStyle = rgb(primary, alpha);
        context.lineWidth = 0.5 + target.disappointment * 0.9;
        context.stroke();
      }

      context.beginPath();
      for (let index = 0; index < particles.count; index += 1) {
        const x = particles.x[index];
        const y = particles.y[index];
        const length = 1.5 + current.sharpness * 7;
        const speed = Math.sqrt(
          particles.vx[index] * particles.vx[index] + particles.vy[index] * particles.vy[index],
        ) || 1;
        context.moveTo(x, y);
        context.lineTo(
          x - (particles.vx[index] / speed) * length,
          y - (particles.vy[index] / speed) * length,
        );
      }
      context.strokeStyle = rgb(primary, 0.55 + target.anger * 0.35);
      context.lineWidth = 0.7 + current.sharpness * 0.8;
      context.stroke();

      context.fillStyle = rgb(secondary, 0.7);
      context.beginPath();
      const stride = target.anger > 0.48 ? 5 : 8;
      for (let index = 0; index < particles.count; index += stride) {
        const radius = 0.6 + (1 - target.disappointment) * 0.7;
        context.moveTo(particles.x[index] + radius, particles.y[index]);
        context.arc(particles.x[index], particles.y[index], radius, 0, Math.PI * 2);
      }
      context.fill();

      const pointer = pointerRef.current;
      context.strokeStyle = rgb(secondary, 0.48);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(pointer.x - 11, pointer.y);
      context.lineTo(pointer.x + 11, pointer.y);
      context.moveTo(pointer.x, pointer.y - 11);
      context.lineTo(pointer.x, pointer.y + 11);
      context.stroke();
      if (pointer.pulse > 0.03) {
        context.beginPath();
        context.arc(pointer.x, pointer.y, 22 + (1 - pointer.pulse) * 90, 0, Math.PI * 2);
        context.strokeStyle = rgb(secondary, pointer.pulse * 0.32);
        context.stroke();
      }
    };

    const frame = (now: number) => {
      const frameTime = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!pausedRef.current) {
        accumulator += frameTime;
        let passes = 0;
        while (accumulator >= FIXED_STEP && passes < 3) {
          simulate(reducedMotion ? FIXED_STEP * 0.45 : FIXED_STEP);
          accumulator -= FIXED_STEP;
          passes += 1;
        }
      }
      render();
      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <main className="cortisol-shell">
      <div
        ref={fieldRef}
        className="field"
        role="application"
        aria-label="Project Cortisol emotional blend field"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>

      <header className="topbar">
        <div className="brand" aria-label="Project Cortisol">
          <span className="brand-mark">+</span>
          <span>Project<br />Cortisol</span>
        </div>
        <div className="session" aria-label="Simulation status">
          <span className="live-dot" />
          Live physiological model / 01
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="icon-button"
            aria-label={paused ? "Resume simulation" : "Pause simulation"}
            aria-pressed={paused}
            title={paused ? "Resume simulation" : "Pause simulation"}
            onClick={togglePause}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Reset emotional field"
            title="Reset emotional field"
            onClick={reset}
          >
            ↺
          </button>
        </div>
      </header>

      <div className={`quadrant-label quadrant-combined ${moodKey === "combined" ? "active" : ""}`}>
        <strong>High resentment</strong>
        <span>Boiling tar</span>
      </div>
      <div className={`quadrant-label quadrant-anger ${moodKey === "anger" ? "active" : ""}`}>
        <strong>Pure rage</strong>
        <span>The flashpoint</span>
      </div>
      <div className={`quadrant-label quadrant-disappointment ${moodKey === "disappointment" ? "active" : ""}`}>
        <strong>Pure despair</strong>
        <span>The sinkhole</span>
      </div>
      <div className={`quadrant-label quadrant-calm ${moodKey === "calm" ? "active" : ""}`}>
        <strong>Baseline calm</strong>
        <span>Rhythmic focus</span>
      </div>

      <span className="axis-label axis-anger">Anger / 1.00</span>
      <span className="axis-label axis-disappointment">Disappointment / 1.00</span>

      <div className="readout" aria-hidden="true">
        Vector field / {Math.round(blendNumber("entropy", mood.anger, mood.disappointment) * 100)}
        <span>Particles / adaptive</span>
      </div>

      <section className="instrument-panel" aria-live="polite">
        <div>
          <p className="state-kicker">Current cortisol state / {moodKey}</p>
          <h1 className="state-name">{copy.label}</h1>
          <p className="state-description">{copy.description}</p>
        </div>

        <div className="controls" aria-label="Emotional controls">
          <label className="control-row">
            <span className="control-label">Anger</span>
            <input
              className="mood-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mood.anger}
              onChange={handleSlider("anger")}
            />
            <span className="control-value">{mood.anger.toFixed(2)}</span>
          </label>
          <label className="control-row">
            <span className="control-label">Disappointment</span>
            <input
              className="mood-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mood.disappointment}
              onChange={handleSlider("disappointment")}
            />
            <span className="control-value">{mood.disappointment.toFixed(2)}</span>
          </label>
        </div>
      </section>
    </main>
  );
}
