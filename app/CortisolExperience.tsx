"use client";

import Image from "next/image";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type ProjectCortisolState, PRODUCTION_SCROLL_CONFIGURATION } from "./cortisol/model";
import { clampCoordinate, createState, ORIGIN_PROFILE, resolveProfile, STATE_PROFILES } from "./cortisol/profiles";
import { WebGLCortisol } from "./cortisol/WebGLCortisol";

const LOAD_DURATION = 2100;

function formatCoordinate(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)}`;
}

function applyCoordinateState(x: number, y: number) {
  return createState(clampCoordinate(x), clampCoordinate(y));
}

export function CortisolExperience() {
  const shellRef = useRef<HTMLElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ProjectCortisolState>(createState());
  const scrollRef = useRef({ progress: 0, velocity: 0 });
  const pausedRef = useRef(false);
  const loadedRef = useRef(false);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const [state, setState] = useState<ProjectCortisolState>(() => createState());
  const [paused, setPaused] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [activeArtwork, setActiveArtwork] = useState(0);
  const profile = useMemo(
    () => resolveProfile(state.coordinates.x, state.coordinates.y),
    [state.coordinates.x, state.coordinates.y],
  );

  const commitCoordinates = useCallback((x: number, y: number) => {
    const next = applyCoordinateState(x, y);
    stateRef.current = next;
    setState(next);
  }, []);

  const positionCursor = useCallback((clientX: number, clientY: number, x: number, y: number) => {
    const cursor = cursorRef.current;
    const bounds = interactionRef.current?.getBoundingClientRect();
    if (!cursor || !bounds) return;
    const left = Math.abs(x) <= 0.05 ? bounds.left + bounds.width * 0.5 : clientX;
    const top = Math.abs(y) <= 0.05 ? bounds.top + bounds.height * 0.5 : clientY;
    cursor.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, []);

  const updateFromPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = interactionRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const localX = Math.min(bounds.width, Math.max(0, event.clientX - bounds.left));
    const localY = Math.min(bounds.height, Math.max(0, event.clientY - bounds.top));
    const x = clampCoordinate((localX / bounds.width) * 2 - 1);
    const y = clampCoordinate(1 - (localY / bounds.height) * 2);
    pointerRef.current.x = event.clientX;
    pointerRef.current.y = event.clientY;
    positionCursor(event.clientX, event.clientY, x, y);
    commitCoordinates(x, y);
  }, [commitCoordinates, positionCursor]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current.active = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || pointerRef.current.active) updateFromPointer(event);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleExpectationChange = (event: ChangeEvent<HTMLInputElement>) => {
    commitCoordinates(Number(event.target.value), state.coordinates.y);
  };

  const handleExpressionChange = (event: ChangeEvent<HTMLInputElement>) => {
    commitCoordinates(state.coordinates.x, Number(event.target.value));
  };

  const reset = useCallback(() => {
    commitCoordinates(0, 0);
    const bounds = interactionRef.current?.getBoundingClientRect();
    if (bounds && cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${bounds.left + bounds.width / 2}px, ${bounds.top + bounds.height / 2}px, 0)`;
    }
  }, [commitCoordinates]);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.key.startsWith("Arrow")) return;
      const step = event.shiftKey ? 0.1 : 0.025;
      const current = stateRef.current.coordinates;
      if (event.key === "ArrowUp") commitCoordinates(current.x, current.y + step);
      if (event.key === "ArrowDown") commitCoordinates(current.x, current.y - step);
      if (event.key === "ArrowLeft") commitCoordinates(current.x - step, current.y);
      if (event.key === "ArrowRight") commitCoordinates(current.x + step, current.y);
      event.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commitCoordinates]);

  useEffect(() => {
    const syncCursor = () => {
      const bounds = interactionRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const x = stateRef.current.coordinates.x;
      const y = stateRef.current.coordinates.y;
      positionCursor(
        bounds.left + ((x + 1) / 2) * bounds.width,
        bounds.top + ((1 - y) / 2) * bounds.height,
        x,
        y,
      );
    };
    syncCursor();
    window.addEventListener("resize", syncCursor);
    return () => window.removeEventListener("resize", syncCursor);
  }, [positionCursor, state.coordinates.x, state.coordinates.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let engine: WebGLCortisol | null = null;
    let animationFrame = 0;
    let previous = performance.now();
    const started = previous;
    let lastLoadPercent = -1;

    try {
      engine = new WebGLCortisol(canvas, reducedMotion);
    } catch (error) {
      canvas.dataset.webglError = "true";
      console.error("Project Cortisol WebGL initialization failed", error);
      return;
    }

    const resize = () => engine?.resize(window.innerWidth, window.innerHeight);
    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      const elapsedMs = now - started;
      const elapsed = elapsedMs / 1000;
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const rawLoad = Math.min(1.08, elapsedMs / LOAD_DURATION);
      const percent = Math.min(100, Math.floor(rawLoad * 100));
      if (percent !== lastLoadPercent) {
        lastLoadPercent = percent;
        setLoadPercent(percent);
      }
      if (rawLoad >= 1.08 && !loadedRef.current) {
        loadedRef.current = true;
        setLoaded(true);
      }
      if (!pausedRef.current || !loadedRef.current) {
        engine?.render(
          stateRef.current,
          reducedMotion ? Math.min(delta, 1 / 60) * 0.35 : delta,
          elapsed,
          scrollRef.current.progress,
          reducedMotion ? 0 : scrollRef.current.velocity,
          rawLoad,
        );
      }
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      engine?.dispose();
    };
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      ...PRODUCTION_SCROLL_CONFIGURATION,
      autoRaf: false,
      duration: reducedMotion ? 0 : 1.2,
    });
    const handleScroll = (event: { progress: number; velocity: number }) => {
      scrollRef.current.progress = event.progress;
      scrollRef.current.velocity = event.velocity;
      shellRef.current?.style.setProperty("--scroll-progress", String(event.progress));
      const rows = Array.from(document.querySelectorAll<HTMLElement>(".registry-row"));
      const viewportFocus = window.innerHeight * 0.5;
      const visibleIndex = rows.findIndex((row) => {
        const bounds = row.getBoundingClientRect();
        return bounds.top <= viewportFocus && bounds.bottom >= viewportFocus;
      });
      const nextArtwork = visibleIndex >= 0
        ? visibleIndex
        : event.progress < 0.2 ? 0 : STATE_PROFILES.length - 1;
      setActiveArtwork((current) => current === nextArtwork ? current : nextArtwork);
      ScrollTrigger.update();
    };
    lenis.on("scroll", handleScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();
    return () => {
      lenis.destroy();
      gsap.ticker.remove(tick);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const artworkProfile = STATE_PROFILES[activeArtwork];

  return (
    <main ref={shellRef} className="cortisol-shell">
      <div className={`preloader ${loaded ? "preloader--complete" : ""}`} aria-hidden={loaded}>
        <div className="preloader-mark">+</div>
        <div className="preloader-readout">
          <span>Neural matter ingestion</span>
          <strong>{String(loadPercent).padStart(2, "0")}</strong>
        </div>
        <div className="preloader-line"><span style={{ transform: `scaleX(${loadPercent / 100})` }} /></div>
      </div>

      <canvas ref={canvasRef} className="webgl-stage" aria-hidden="true" />
      <div className="twelve-column-grid" aria-hidden="true" />

      <header className="system-header">
        <a className="brand" href="#origin" aria-label="Project Cortisol, return to origin">
          <span className="brand-mark">+</span>
          <span>Project Cortisol</span>
        </a>
        <div className="session"><span className="live-dot" />Live physiological model / Rev.01</div>
        <div className="header-actions">
          <button type="button" className="icon-button" onClick={togglePause} aria-label={paused ? "Resume simulation" : "Pause simulation"} aria-pressed={paused} title={paused ? "Resume" : "Pause"}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <button type="button" className="icon-button" onClick={reset} aria-label="Return coordinates to origin" title="Reset to origin">
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="fixed-telemetry" aria-live="polite">
        <span>{profile.indexCode}</span>
        <strong>{profile.telemetry}</strong>
      </div>

      <section id="origin" className="simulation-viewport" aria-label="Project Cortisol eight-state emotional coordinate field">
        <div
          ref={interactionRef}
          className="interaction-field"
          role="application"
          aria-label="Bidirectional expectation and expression plane"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="field-axis field-axis--x" aria-hidden="true" />
          <div className="field-axis field-axis--y" aria-hidden="true" />
          <div ref={cursorRef} className={`field-cursor field-cursor--${state.cursorProperties.visualStyle}`} aria-hidden="true"><i /><b /></div>
          <span className="edge-label edge-label--top">Expression / +1</span>
          <span className="edge-label edge-label--bottom">Serenity / -1</span>
          <span className="edge-label edge-label--left">Disappointment / -1</span>
          <span className="edge-label edge-label--right">Fulfillment / +1</span>
          <span className="origin-label">0,0</span>
        </div>

        <div className="hero-readout">
          <p>{profile.eyebrow}</p>
          <h1>{profile.label}</h1>
          <div className="hero-meta">
            <p>{profile.description}</p>
            <span>{profile.systemMetrics}</span>
          </div>
        </div>

        <label className="axis-control axis-control--x">
          <span>Expectation</span>
          <input type="range" min="-1" max="1" step="0.01" value={state.coordinates.x} onChange={handleExpectationChange} aria-label="Expectation: disappointment to fulfillment" />
          <output>{formatCoordinate(state.coordinates.x)}</output>
        </label>
        <label className="axis-control axis-control--y">
          <span>Expression</span>
          <input type="range" min="-1" max="1" step="0.01" value={state.coordinates.y} onChange={handleExpressionChange} aria-label="Expression: serenity to anger" />
          <output>{formatCoordinate(state.coordinates.y)}</output>
        </label>
      </section>

      <section className="registry" aria-labelledby="registry-title">
        <div className="section-index">
          <span>01 / State registry</span>
          <p id="registry-title">Eight representative somatic systems</p>
        </div>
        {STATE_PROFILES.map((item, index) => (
          <article key={item.id} className={`registry-row ${activeArtwork === index ? "registry-row--active" : ""}`}>
            <div className="registry-number">0{index + 1}</div>
            <figure className="registry-artwork">
              <Image src="/og.png" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" priority={index < 2} style={{ objectPosition: `${index % 2 ? 72 : 38}% ${30 + (index % 4) * 14}%` }} />
              <span>{item.indexCode}</span>
            </figure>
            <div className="registry-copy">
              <p>{item.eyebrow}</p>
              <h2>{item.label}</h2>
              <span>{item.shortLabel}</span>
              <div>
                <p>{item.description}</p>
                <code>{item.systemMetrics}</code>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="editorial-telemetry" aria-label="Physiological analysis">
        <div className="telemetry-heading">
          <span>02 / Somatic analysis</span>
          <p>Current signal</p>
        </div>
        <div className="telemetry-state">
          <p>{artworkProfile.indexCode}</p>
          <h2>{artworkProfile.telemetry}</h2>
        </div>
        <dl className="metrics-list">
          <div><dt>Expectation vector</dt><dd>{formatCoordinate(state.coordinates.x)}</dd></div>
          <div><dt>Expression vector</dt><dd>{formatCoordinate(state.coordinates.y)}</dd></div>
          <div><dt>Gravity field</dt><dd>{state.engineConstants.gravityField.toFixed(2)}</dd></div>
          <div><dt>Viscosity</dt><dd>{state.engineConstants.viscosity.toFixed(2)}</dd></div>
          <div><dt>Entropy factor</dt><dd>{state.engineConstants.entropyFactor.toFixed(2)}</dd></div>
          <div><dt>Noise frequency</dt><dd>{state.engineConstants.noiseFrequency.toFixed(2)}</dd></div>
        </dl>
        <p className="closing-signal">{state.telemetryMetadata.somaticDescriptionText}</p>
        <a className="return-link" href="#origin">Return to biological origin <span>+</span></a>
      </section>

      <footer className="system-footer">
        <span>Project Cortisol / {new Date().getFullYear()}</span>
        <span>WebGL physiological engine</span>
        <span>{ORIGIN_PROFILE.indexCode}</span>
      </footer>
    </main>
  );
}
