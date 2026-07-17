"use client";

import Image from "next/image";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ArrowDown, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import {
  type CSSProperties,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PRODUCTION_SCROLL_CONFIGURATION, type MoodProfile, type ProjectCortisolGlobalState } from "./cortisol/model";
import {
  clampCoordinate,
  createState,
  getMoodIndex,
  MOOD_VISUALS,
  ORIGIN_PROFILE,
  resolveProfile,
  STATE_PROFILES,
} from "./cortisol/profiles";
import { WebGLCortisol } from "./cortisol/WebGLCortisol";

const LOAD_DURATION = 2800;
const CLUSTER_LAYOUT = [
  { x: 4, y: 6, size: 23, rotate: -3 },
  { x: 30, y: 2, size: 19, rotate: 2 },
  { x: 52, y: 10, size: 24, rotate: -1 },
  { x: 75, y: 4, size: 20, rotate: 3 },
  { x: 12, y: 52, size: 19, rotate: 2 },
  { x: 34, y: 44, size: 25, rotate: -2 },
  { x: 61, y: 52, size: 18, rotate: 1 },
  { x: 78, y: 43, size: 22, rotate: -3 },
] as const;

const FOCUS_SUBHEADS: Record<string, string> = {
  "01_EUPHORIC_ECSTASY": "THE CONVERGENCE OF HIGH ENERGY & SURPASSED EXPECTATIONS",
  "02_BOILING_TAR": "THE CONVERGENCE OF HIGH ENERGY & UNMET EXPECTATIONS",
  "03_SOMBER_GRACE": "THE CONVERGENCE OF LOW ENERGY & UNMET EXPECTATIONS",
  "04_PRISTINE_NIRVANA": "THE CONVERGENCE OF LOW ENERGY & FULFILLED EXPECTATIONS",
  "05_THE_FUSE": "PURE HIGH ENERGY WITHOUT AN EXPECTED OUTCOME",
  "06_THE_LIMBO": "PURE DISAPPOINTMENT WITHOUT AN OUTWARD RESPONSE",
  "07_THE_STASIS": "PURE SERENITY WITHOUT EXPECTATION",
  "08_THE_HORIZON": "PURE FULFILLMENT WITHOUT URGENCY",
};

function formatCoordinate(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)}`;
}

function moodNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function CortisolExperience() {
  const shellRef = useRef<HTMLElement>(null);
  const narrativeRef = useRef<HTMLElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const focusDescriptionRef = useRef<HTMLParagraphElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const stateRef = useRef<ProjectCortisolGlobalState>(createState());
  const scrollRef = useRef({ progress: 0, velocity: 0 });
  const pausedRef = useRef(false);
  const loadedRef = useRef(false);
  const pointerRef = useRef({ active: false });
  const swipeStartRef = useRef<number | null>(null);
  const [state, setState] = useState<ProjectCortisolGlobalState>(() => createState());
  const [paused, setPaused] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const profile = useMemo(
    () => resolveProfile(state.inputCoordinates.x, state.inputCoordinates.y),
    [state.inputCoordinates.x, state.inputCoordinates.y],
  );
  const focusedProfile = useMemo<MoodProfile>(() => {
    const selected = state.scrollState.activeFocusMoodId;
    return STATE_PROFILES.find((item) => item.id === selected)
      ?? (profile.id === ORIGIN_PROFILE.id ? STATE_PROFILES[0] : profile as MoodProfile);
  }, [profile, state.scrollState.activeFocusMoodId]);
  const focusIndex = getMoodIndex(focusedProfile.id);
  const cursorStyle = MOOD_VISUALS[profile.id].cursorStyle;

  const commitCoordinates = useCallback((x: number, y: number) => {
    const nextX = clampCoordinate(x);
    const nextY = clampCoordinate(y);
    const nextProfile = resolveProfile(nextX, nextY);
    const current = stateRef.current;
    const next: ProjectCortisolGlobalState = {
      ...current,
      inputCoordinates: { x: nextX, y: nextY },
      scrollState: {
        ...current.scrollState,
        activeFocusMoodId: nextProfile.id === ORIGIN_PROFILE.id
          ? current.scrollState.activeFocusMoodId
          : nextProfile.id,
      },
    };
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
    positionCursor(event.clientX, event.clientY, x, y);
    commitCoordinates(x, y);
  }, [commitCoordinates, positionCursor]);

  const selectMood = useCallback((moodId: string, jumpToFocus = true) => {
    const current = stateRef.current;
    const next: ProjectCortisolGlobalState = {
      ...current,
      scrollState: { ...current.scrollState, activeFocusMoodId: moodId },
    };
    stateRef.current = next;
    setState(next);
    if (jumpToFocus && scrollTriggerRef.current) {
      const trigger = scrollTriggerRef.current;
      const moodIndex = Math.max(0, getMoodIndex(moodId));
      const moodProgress = 0.32 + ((moodIndex + 0.16) / STATE_PROFILES.length) * 0.68;
      lenisRef.current?.scrollTo(trigger.start + (trigger.end - trigger.start) * moodProgress, {
        duration: 1.1,
        easing: (value) => 1 - Math.pow(1 - value, 3),
      });
    }
  }, []);

  const cycleMood = useCallback((direction: number) => {
    const nextIndex = (getMoodIndex(stateRef.current.scrollState.activeFocusMoodId ?? focusedProfile.id) + direction + STATE_PROFILES.length) % STATE_PROFILES.length;
    selectMood(STATE_PROFILES[nextIndex].id, true);
  }, [focusedProfile.id, selectMood]);

  const reset = useCallback(() => commitCoordinates(0, 0), [commitCoordinates]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (stateRef.current.scrollState.currentStage === "SINGLE_FOCUS" && event.key === "ArrowLeft") {
        cycleMood(-1);
        return;
      }
      if (stateRef.current.scrollState.currentStage === "SINGLE_FOCUS" && event.key === "ArrowRight") {
        cycleMood(1);
        return;
      }
      if (!event.key.startsWith("Arrow")) return;
      const step = event.shiftKey ? 0.1 : 0.025;
      const current = stateRef.current.inputCoordinates;
      if (event.key === "ArrowUp") commitCoordinates(current.x, current.y + step);
      if (event.key === "ArrowDown") commitCoordinates(current.x, current.y - step);
      if (event.key === "ArrowLeft") commitCoordinates(current.x - step, current.y);
      if (event.key === "ArrowRight") commitCoordinates(current.x + step, current.y);
      event.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commitCoordinates, cycleMood]);

  useEffect(() => {
    const syncCursor = () => {
      const bounds = interactionRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const { x, y } = stateRef.current.inputCoordinates;
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
  }, [positionCursor, state.inputCoordinates.x, state.inputCoordinates.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let engine: WebGLCortisol | null = null;
    let animationFrame = 0;
    let previous = performance.now();
    const started = previous;
    let assetsLoaded = 0;
    let lastLoadPercent = -1;

    STATE_PROFILES.forEach((mood) => {
      const asset = new window.Image();
      const settled = () => { assetsLoaded += 1; };
      asset.addEventListener("load", settled, { once: true });
      asset.addEventListener("error", settled, { once: true });
      asset.src = mood.imageAssetPath;
    });

    try {
      engine = new WebGLCortisol(canvas);
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
      const timeProgress = elapsedMs / LOAD_DURATION;
      const ingestion = Math.min(0.8, Math.max(timeProgress * 0.8, (assetsLoaded / STATE_PROFILES.length) * 0.8));
      const settling = assetsLoaded === STATE_PROFILES.length ? Math.max(0, timeProgress - 0.8) : 0;
      const rawLoad = Math.min(1.08, ingestion + settling);
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
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      ...PRODUCTION_SCROLL_CONFIGURATION,
      autoRaf: false,
      duration: reducedMotion ? 0 : 1.2,
    });
    lenisRef.current = lenis;
    lenis.on("scroll", (event: { velocity: number }) => {
      scrollRef.current.velocity = event.velocity;
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const trigger = ScrollTrigger.create({
      trigger: narrativeRef.current,
      start: "top top",
      end: "+=900%",
      pin: true,
      scrub: reducedMotion ? false : 0.8,
      anticipatePin: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        const stage: ProjectCortisolGlobalState["scrollState"]["currentStage"] = progress < 0.18
          ? "SANDBOX"
          : progress < 0.32 ? "CLUSTER_ASSEMBLY" : "SINGLE_FOCUS";
        const normalizedFocusProgress = Math.min(0.999999, Math.max(0, (progress - 0.32) / 0.68));
        const focusPosition = normalizedFocusProgress * STATE_PROFILES.length;
        const scrollFocusIndex = Math.min(STATE_PROFILES.length - 1, Math.floor(focusPosition));
        const localFocusProgress = focusPosition - scrollFocusIndex;
        scrollRef.current.progress = progress;
        shellRef.current?.style.setProperty("--narrative-progress", String(progress));
        shellRef.current?.style.setProperty("--cluster-progress", String(Math.min(1, Math.max(0, (progress - 0.18) / 0.14))));
        shellRef.current?.style.setProperty("--focus-progress", String(stage === "SINGLE_FOCUS" ? localFocusProgress : 0));
        const current = stateRef.current;
        const autoProfile = resolveProfile(current.inputCoordinates.x, current.inputCoordinates.y);
        const activeFocusMoodId = stage === "SINGLE_FOCUS"
          ? STATE_PROFILES[scrollFocusIndex].id
          : current.scrollState.activeFocusMoodId
            ?? (autoProfile.id === ORIGIN_PROFILE.id ? STATE_PROFILES[0].id : autoProfile.id);
        current.scrollState.progress = progress;
        if (current.scrollState.currentStage !== stage || current.scrollState.activeFocusMoodId !== activeFocusMoodId) {
          const next: ProjectCortisolGlobalState = {
            ...current,
            scrollState: { currentStage: stage, progress, activeFocusMoodId },
          };
          stateRef.current = next;
          setState(next);
        }
      },
    });
    scrollTriggerRef.current = trigger;
    ScrollTrigger.refresh();
    return () => {
      trigger.kill();
      lenis.destroy();
      lenisRef.current = null;
      scrollTriggerRef.current = null;
      gsap.ticker.remove(tick);
    };
  }, []);

  useEffect(() => {
    if (state.scrollState.currentStage !== "SINGLE_FOCUS" || !focusDescriptionRef.current) return;
    const split = SplitText.create(focusDescriptionRef.current, { type: "lines", linesClass: "focus-copy-line" });
    gsap.fromTo(split.lines, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.82, stagger: 0.07, ease: "power3.out" });
    return () => split.revert();
  }, [focusedProfile.id, state.scrollState.currentStage]);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  return (
    <main ref={shellRef} className={`cortisol-shell ${loaded ? "is-loaded" : ""}`} data-stage={state.scrollState.currentStage}>
      <div className={`preloader ${loaded ? "preloader--complete" : ""}`} aria-hidden={loaded}>
        <div className="preloader-mark">+</div>
        <div className="preloader-phase">
          <span>{loadPercent < 80 ? "Gathering scattered light" : loadPercent < 100 ? "Slowing the spiral" : "Settling at center"}</span>
          <strong>{String(loadPercent).padStart(2, "0")}</strong>
        </div>
        <div className="preloader-line"><span style={{ transform: `scaleX(${loadPercent / 100})` }} /></div>
      </div>

      <canvas ref={canvasRef} className="webgl-stage" aria-hidden="true" />
      <div className="twelve-column-grid" aria-hidden="true" />

      <header className="system-header interface-layer">
        <a className="brand" href="#experience" aria-label="Project Cortisol, return to the emotional map">
          <span className="brand-mark">+</span>
          <span>Project Cortisol</span>
        </a>
        <div className="session"><span className="live-dot" />Live emotional field</div>
        <div className="header-actions">
          <button type="button" className="icon-button" onClick={togglePause} aria-label={paused ? "Resume motion" : "Pause motion"} aria-pressed={paused} title={paused ? "Resume" : "Pause"}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <button type="button" className="icon-button" onClick={reset} aria-label="Return both controls to center" title="Reset to center">
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

      <section id="experience" ref={narrativeRef} className="narrative-stage" aria-label="Project Cortisol emotional archetype experience">
        <section className="sandbox-stage" aria-label="Interactive emotional map">
          <div
            ref={interactionRef}
            className="interaction-field"
            role="application"
            aria-label="Bidirectional expectation and expression plane"
            tabIndex={0}
            onPointerDown={(event) => {
              pointerRef.current.active = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (pointerRef.current.active) updateFromPointer(event);
            }}
            onPointerUp={(event) => {
              pointerRef.current.active = false;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          >
            <div className="field-axis field-axis--x" aria-hidden="true" />
            <div className="field-axis field-axis--y" aria-hidden="true" />
            <div ref={cursorRef} className={`field-cursor field-cursor--${cursorStyle}`} aria-hidden="true"><i /><b /></div>
            <span className="origin-label">0,0</span>
          </div>

          <div className="thesis-copy interface-layer">
            <p>Project Cortisol</p>
            <h1>An interactive map of human tension.</h1>
            <p>We rarely feel just one emotion at a time. We exist in the blurred intersections between expectation and reality, energy and exhaustion. Use the dual controls to calibrate your current state of mind and visualize the emotional weight you are carrying.</p>
          </div>

          <div className="current-mood interface-layer" aria-live="polite">
            <span>{profile.subtitle}</span>
            <strong>{profile.title}</strong>
            <p>{profile.visceralDescription}</p>
          </div>

          <label className="axis-control axis-control--x interface-layer" data-axis="X">
            <span>Expectation axis // [ -1.0 disappointment | +1.0 fulfillment ]</span>
            <input type="range" min="-1" max="1" step="0.01" value={state.inputCoordinates.x} onChange={(event: ChangeEvent<HTMLInputElement>) => commitCoordinates(Number(event.target.value), stateRef.current.inputCoordinates.y)} aria-label="Expectation axis: disappointment to fulfillment" />
            <output>{formatCoordinate(state.inputCoordinates.x)}</output>
          </label>
          <label className="axis-control axis-control--y interface-layer" data-axis="Y">
            <span>Expression axis // [ -1.0 serenity | +1.0 anger ]</span>
            <input type="range" min="-1" max="1" step="0.01" value={state.inputCoordinates.y} onChange={(event: ChangeEvent<HTMLInputElement>) => commitCoordinates(stateRef.current.inputCoordinates.x, Number(event.target.value))} aria-label="Expression axis: serenity to anger" />
            <output>{formatCoordinate(state.inputCoordinates.y)}</output>
          </label>

          <div className="scroll-prompt interface-layer">
            <span>Scroll down to explore the 8 emotional archetypes</span>
            <ArrowDown aria-hidden="true" />
          </div>
        </section>

        <section className="cluster-stage" aria-label="Eight emotional archetypes">
          <div className="cluster-heading">
            <span>Eight states / choose one or keep scrolling</span>
            <p>The blurred intersections</p>
          </div>
          <div className="mood-cluster">
            {STATE_PROFILES.map((mood, index) => {
              const layout = CLUSTER_LAYOUT[index];
              const style = {
                "--cluster-x": `${layout.x}%`,
                "--cluster-y": `${layout.y}%`,
                "--cluster-size": `${layout.size}%`,
                "--cluster-rotate": `${layout.rotate}deg`,
                "--cluster-index": index,
              } as CSSProperties;
              return (
                <button key={mood.id} type="button" className="mood-tile" style={style} onClick={() => selectMood(mood.id)} aria-label={`Focus ${mood.title}`}>
                  <Image src={mood.imageAssetPath} alt="" fill sizes="(max-width: 760px) 42vw, 24vw" priority />
                  <span>[ {moodNumber(index)}{" // "}{mood.title} ]</span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="focus-stage"
          aria-label={`${focusedProfile.title} editorial view`}
          onPointerDown={(event) => { swipeStartRef.current = event.clientX; }}
          onPointerUp={(event) => {
            if (swipeStartRef.current === null) return;
            const distance = event.clientX - swipeStartRef.current;
            if (Math.abs(distance) > 48) cycleMood(distance > 0 ? -1 : 1);
            swipeStartRef.current = null;
          }}
        >
          <figure key={`image-${focusedProfile.id}`} className="focus-image">
            <Image src={focusedProfile.imageAssetPath} alt={`${focusedProfile.title} visual study`} fill sizes="(max-width: 900px) 84vw, 42vw" priority />
            <figcaption>{moodNumber(focusIndex)} / 08</figcaption>
          </figure>
          <article key={`copy-${focusedProfile.id}`} className="focus-editorial">
            <p>State {moodNumber(focusIndex)}{" // "}{focusedProfile.title}</p>
            <h2>{FOCUS_SUBHEADS[focusedProfile.id]}</h2>
            <p key={focusedProfile.id} ref={focusDescriptionRef} className="focus-description">{focusedProfile.visceralDescription}</p>
            <footer>{focusedProfile.biometricHUD}</footer>
          </article>
          <nav className="mood-switcher" aria-label="Explore other moods">
            <button type="button" className="switcher-arrow" onClick={() => cycleMood(-1)} aria-label="Previous mood" title="Previous mood"><ChevronLeft aria-hidden="true" /></button>
            <div className="switcher-track">
              {STATE_PROFILES.map((mood, index) => (
                <button key={mood.id} type="button" className={mood.id === focusedProfile.id ? "is-active" : ""} onClick={() => selectMood(mood.id, true)}>
                  {moodNumber(index)} {mood.title.replace("THE ", "")}
                </button>
              ))}
            </div>
            <button type="button" className="switcher-arrow" onClick={() => cycleMood(1)} aria-label="Next mood" title="Next mood"><ChevronRight aria-hidden="true" /></button>
          </nav>
        </section>
      </section>

      <section className="quote-stage" aria-labelledby="buried-emotions-quote">
        <p>Afterword / what the body keeps</p>
        <blockquote id="buried-emotions-quote">&quot;Unexpressed emotions will never die. They are buried alive and will come forth later in uglier ways.&quot;</blockquote>
        <div className="quote-context">
          <cite>Sigmund Freud</cite>
          <p>when we experience a painful or socially unacceptable emotion and refuse to process it, the conscious mind pushes it down into the unconscious. Because that emotional energy cannot simply vanish, it festers beneath the surface and eventually &quot;leaks out&quot; as anxiety, physical tension, irritability, or explosive mood swings</p>
        </div>
      </section>

      <section className="about-cortisol" aria-labelledby="about-project-cortisol">
        <p>Project Cortisol</p>
        <h2 id="about-project-cortisol">An experimental website to experience visualization of our combined mood.</h2>
        <span>Arka Auzan</span>
      </section>

      <footer className="system-footer">
        <span>Project Cortisol / {new Date().getFullYear()}</span>
        <span>Eight ways tension can live in the body</span>
        <a href="#experience">Return to the map +</a>
      </footer>
    </main>
  );
}
