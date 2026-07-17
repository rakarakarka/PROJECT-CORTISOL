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
  { x: 5, y: 13, size: 18, depth: -760, enterX: -34, enterY: -18 },
  { x: 29, y: 3, size: 13, depth: -420, enterX: 18, enterY: -31 },
  { x: 51, y: 17, size: 16, depth: -940, enterX: -8, enterY: 26 },
  { x: 78, y: 7, size: 14, depth: -560, enterX: 31, enterY: -16 },
  { x: 12, y: 60, size: 13, depth: -880, enterX: -26, enterY: 24 },
  { x: 35, y: 48, size: 18, depth: -350, enterX: 12, enterY: 32 },
  { x: 62, y: 59, size: 12, depth: -690, enterX: -16, enterY: 28 },
  { x: 81, y: 46, size: 16, depth: -1020, enterX: 28, enterY: 18 },
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

function moodSectionId(moodId: string) {
  return `mood-${moodId.toLowerCase().replaceAll("_", "-")}`;
}

function colorValue(color: [number, number, number]) {
  return `rgb(${color.map((channel) => Math.round(channel * 255)).join(" ")})`;
}

export function CortisolExperience() {
  const shellRef = useRef<HTMLElement>(null);
  const narrativeRef = useRef<HTMLElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
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
  const cursorStyle = MOOD_VISUALS[profile.id].cursorStyle;
  const glowStyle = useMemo(() => {
    const visual = MOOD_VISUALS[profile.id];
    const energy = Math.max(Math.abs(state.inputCoordinates.x), Math.abs(state.inputCoordinates.y));
    return {
      "--mood-glow-a": colorValue(visual.colorA),
      "--mood-glow-b": colorValue(visual.colorB),
      "--mood-glow-energy": String(0.34 + energy * 0.16),
    } as CSSProperties;
  }, [profile.id, state.inputCoordinates.x, state.inputCoordinates.y]);

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
    if (jumpToFocus) {
      const target = document.getElementById(moodSectionId(moodId));
      if (!target) return;
      lenisRef.current?.scrollTo(target, {
        duration: 1.25,
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
      if (stateRef.current.scrollState.currentStage === "DETAIL_SEQUENCE" && event.key === "ArrowLeft") {
        cycleMood(-1);
        return;
      }
      if (stateRef.current.scrollState.currentStage === "DETAIL_SEQUENCE" && event.key === "ArrowRight") {
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

    const splitInstances: SplitText[] = [];
    const activateMood = (moodId: string) => {
      const current = stateRef.current;
      if (current.scrollState.activeFocusMoodId === moodId && current.scrollState.currentStage === "DETAIL_SEQUENCE") return;
      const next: ProjectCortisolGlobalState = {
        ...current,
        scrollState: { ...current.scrollState, currentStage: "DETAIL_SEQUENCE", activeFocusMoodId: moodId },
      };
      stateRef.current = next;
      setState(next);
    };

    const context = gsap.context(() => {
      const moodTiles = gsap.utils.toArray<HTMLElement>(".mood-tile");
      const clusterPrompt = document.querySelector<HTMLElement>(".cluster-motion-copy");
      let clusterPromptChars: HTMLElement[] = [];
      if (clusterPrompt && !reducedMotion) {
        const split = SplitText.create(clusterPrompt, {
          type: "words,chars",
          wordsClass: "cluster-prompt-word",
          charsClass: "cluster-prompt-char",
        });
        splitInstances.push(split);
        clusterPromptChars = split.chars as HTMLElement[];
        clusterPromptChars.forEach((character) => {
          character.style.opacity = "0";
          character.style.transform = "translate3d(32px, 0, 0)";
        });
      }
      const trigger = ScrollTrigger.create({
        trigger: narrativeRef.current,
        start: "top top",
        end: "+=260%",
        pin: true,
        scrub: reducedMotion ? false : 0.75,
        anticipatePin: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const stage: ProjectCortisolGlobalState["scrollState"]["currentStage"] = progress < 0.24
            ? "SANDBOX"
            : "CLUSTER_ASSEMBLY";
          const clusterProgress = Math.min(1, Math.max(0, (progress - 0.24) / 0.6));
          scrollRef.current.progress = progress;
          shellRef.current?.style.setProperty("--narrative-progress", String(progress));
          shellRef.current?.style.setProperty("--cluster-progress", String(clusterProgress));
          clusterPromptChars.forEach((character, index) => {
            const characterProgress = Math.min(1, Math.max(0, (clusterProgress - index * 0.009) / 0.34));
            const characterEase = 1 - Math.pow(1 - characterProgress, 3);
            character.style.opacity = String(characterEase);
            character.style.transform = `translate3d(${(1 - characterEase) * 32}px, 0, 0)`;
          });
          moodTiles.forEach((tile, index) => {
            const layout = CLUSTER_LAYOUT[index];
            const staggered = Math.min(1, Math.max(0, (clusterProgress - index * 0.055) / 0.62));
            const eased = 1 - Math.pow(1 - staggered, 3);
            tile.style.opacity = String(Math.min(1, staggered * 1.35));
            tile.style.filter = `blur(${(1 - eased) * 11}px)`;
            tile.style.transform = `perspective(1200px) translate3d(${layout.enterX * (1 - eased)}vw, ${layout.enterY * (1 - eased)}vh, ${layout.depth * (1 - eased)}px) scale(${0.42 + eased * 0.58})`;
          });
          const current = stateRef.current;
          const autoProfile = resolveProfile(current.inputCoordinates.x, current.inputCoordinates.y);
          const activeFocusMoodId = current.scrollState.activeFocusMoodId
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
        onLeave: () => {
          activateMood(stateRef.current.scrollState.activeFocusMoodId ?? STATE_PROFILES[0].id);
        },
      });
      scrollTriggerRef.current = trigger;

      gsap.utils.toArray<HTMLElement>(".mood-detail").forEach((section, index) => {
        const image = section.querySelector<HTMLElement>(".mood-detail__image");
        const heading = section.querySelector<HTMLElement>(".mood-detail__editorial h2");
        if (image && !reducedMotion) {
          gsap.fromTo(image, { scale: 0.9, opacity: 0.52 }, {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: section, start: "top 88%", end: "top 24%", scrub: 0.7 },
          });
        }
        if (heading && !reducedMotion) {
          const split = SplitText.create(heading, { type: "lines", linesClass: "detail-heading-line" });
          splitInstances.push(split);
          gsap.from(split.lines, {
            yPercent: 115,
            opacity: 0,
            duration: 0.78,
            stagger: 0.075,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 68%", toggleActions: "play none none reverse" },
          });
        }
        ScrollTrigger.create({
          trigger: section,
          start: "top 52%",
          end: "bottom 48%",
          onEnter: () => activateMood(STATE_PROFILES[index].id),
          onEnterBack: () => activateMood(STATE_PROFILES[index].id),
        });
      });

      const quote = document.querySelector<HTMLElement>(".quote-motion-copy");
      if (quote && !reducedMotion) {
        const split = SplitText.create(quote, { type: "words", wordsClass: "quote-motion-word" });
        splitInstances.push(split);
        gsap.from(split.words, {
          x: 90,
          opacity: 0,
          duration: 0.62,
          stagger: 0.026,
          ease: "power3.out",
          scrollTrigger: { trigger: quote, start: "top 82%", toggleActions: "play none none reverse" },
        });
      }

      const about = document.querySelector<HTMLElement>(".about-motion-copy");
      if (about && !reducedMotion) {
        const split = SplitText.create(about, { type: "lines", linesClass: "about-motion-line" });
        splitInstances.push(split);
        gsap.from(split.lines, {
          yPercent: 125,
          opacity: 0,
          duration: 0.74,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: about, start: "top 86%", toggleActions: "play none none reverse" },
        });
      }
    }, shellRef);

    ScrollTrigger.refresh();
    return () => {
      context.revert();
      splitInstances.forEach((split) => split.revert());
      lenis.destroy();
      lenisRef.current = null;
      scrollTriggerRef.current = null;
      gsap.ticker.remove(tick);
    };
  }, []);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  return (
    <main ref={shellRef} className={`cortisol-shell ${loaded ? "is-loaded" : ""}`} data-stage={state.scrollState.currentStage} style={glowStyle}>
      <div className={`preloader ${loaded ? "preloader--complete" : ""}`} aria-hidden={loaded}>
        <div className="preloader-mark">+</div>
        <div className="preloader-phase">
          <span>{loadPercent < 80 ? "Drawing matter inward" : loadPercent < 100 ? "Folding into orbit" : "Breathing at center"}</span>
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
          <div className="homepage-edge-glow" aria-hidden="true" />
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
            <h1>An&nbsp;interactive map of human tension.</h1>
            <p>We rarely feel just one emotion at a time. We exist in the blurred intersections between expectation and reality, energy and exhaustion. Use the dual controls to calibrate your current state of mind and visualize the emotional weight you are carrying.</p>
          </div>

          <div className="current-mood interface-layer" aria-live="polite">
            <span>{profile.subtitle}</span>
            <strong>{profile.title}</strong>
            <p>{profile.visceralDescription}</p>
          </div>

          <fieldset className="mood-control-panel interface-layer">
            <legend>Control the Mood Particle</legend>
            <label className="axis-control">
              <span className="axis-control__title">X / Expectation <output>{formatCoordinate(state.inputCoordinates.x)}</output></span>
              <span className="axis-control__rail">
                <span>Disappointment</span>
                <input type="range" min="-1" max="1" step="0.01" value={state.inputCoordinates.x} onChange={(event: ChangeEvent<HTMLInputElement>) => commitCoordinates(Number(event.target.value), stateRef.current.inputCoordinates.y)} aria-label="Expectation axis: disappointment to fulfillment" />
                <span>Fulfillment</span>
              </span>
              <span className="axis-control__ticks" aria-hidden="true"><span>-1</span><span>0</span><span>1</span></span>
            </label>
            <label className="axis-control">
              <span className="axis-control__title">Y / Expression <output>{formatCoordinate(-state.inputCoordinates.y)}</output></span>
              <span className="axis-control__rail">
                <span>Anger</span>
                <input type="range" min="-1" max="1" step="0.01" value={-state.inputCoordinates.y} onChange={(event: ChangeEvent<HTMLInputElement>) => commitCoordinates(stateRef.current.inputCoordinates.x, -Number(event.target.value))} aria-label="Expression axis: anger to serenity" />
                <span>Serenity</span>
              </span>
              <span className="axis-control__ticks" aria-hidden="true"><span>-1</span><span>0</span><span>1</span></span>
            </label>
            <p className="mood-control-hint">Or click and drag around the space</p>
          </fieldset>

          <div className="scroll-prompt interface-layer">
            <span>Scroll down to explore the 8 emotional archetypes</span>
            <ArrowDown aria-hidden="true" />
          </div>
        </section>

        <section className="cluster-stage" aria-label="Eight emotional archetypes">
          <div className="cluster-heading">
            <span className="cluster-motion-copy">Stop to feel and select the image, or continue to scroll</span>
          </div>
          <div className="mood-cluster">
            {STATE_PROFILES.map((mood, index) => {
              const layout = CLUSTER_LAYOUT[index];
              const style = {
                "--cluster-x": `${layout.x}%`,
                "--cluster-y": `${layout.y}%`,
                "--cluster-size": `${layout.size}%`,
                "--cluster-depth": `${layout.depth}px`,
                "--cluster-enter-x": `${layout.enterX}vw`,
                "--cluster-enter-y": `${layout.enterY}vh`,
                "--cluster-delay": index * 0.055,
                "--cluster-index": index,
                "--float-duration": `${7.2 + (index % 4) * 0.7}s`,
                "--float-delay": `${index * -0.83}s`,
                "--float-distance": `${7 + (index % 3) * 2}px`,
              } as CSSProperties;
              return (
                <button key={mood.id} type="button" className={`mood-tile ${mood.id === focusedProfile.id ? "is-selected" : ""}`} style={style} onClick={() => selectMood(mood.id)} aria-label={`Focus ${mood.title}`}>
                  <span className="mood-tile__surface">
                    <Image src={mood.imageAssetPath} alt="" fill sizes="(max-width: 760px) 42vw, 24vw" priority />
                    <span className="mood-tile__label">[ {moodNumber(index)}{" // "}{mood.title} ]</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

      </section>

      <section
        className="mood-details"
        aria-label="Eight mood detail chapters"
        onPointerDown={(event) => { swipeStartRef.current = event.clientX; }}
        onPointerUp={(event) => {
          if (swipeStartRef.current === null) return;
          const distance = event.clientX - swipeStartRef.current;
          if (Math.abs(distance) > 48) cycleMood(distance > 0 ? -1 : 1);
          swipeStartRef.current = null;
        }}
      >
        {STATE_PROFILES.map((mood, index) => {
          const previousMood = STATE_PROFILES[(index - 1 + STATE_PROFILES.length) % STATE_PROFILES.length];
          const nextMood = STATE_PROFILES[(index + 1) % STATE_PROFILES.length];
          return (
            <section key={mood.id} id={moodSectionId(mood.id)} className="mood-detail" data-mood-id={mood.id} aria-labelledby={`${moodSectionId(mood.id)}-title`}>
              <figure className="mood-detail__image">
                <Image src={mood.imageAssetPath} alt={`${mood.title} visual study`} fill sizes="(max-width: 900px) 84vw, 42vw" />
                <figcaption>{moodNumber(index)} / 08</figcaption>
              </figure>
              <article className="mood-detail__editorial">
                <p>State {moodNumber(index)}{" // "}{mood.title}</p>
                <h2 id={`${moodSectionId(mood.id)}-title`}>{FOCUS_SUBHEADS[mood.id]}</h2>
                <p>{mood.visceralDescription}</p>
                <footer>{mood.biometricHUD}</footer>
              </article>
              <nav className="mood-switcher detail-switcher" aria-label={`Explore moods from ${mood.title}`}>
                <button type="button" className="switcher-arrow" onClick={() => selectMood(previousMood.id, true)} aria-label={`Previous mood: ${previousMood.title}`} title="Previous mood"><ChevronLeft aria-hidden="true" /></button>
                <div className="switcher-track">
                  {STATE_PROFILES.map((item, itemIndex) => (
                    <button key={item.id} type="button" className={item.id === mood.id ? "is-active" : ""} onClick={() => selectMood(item.id, true)}>
                      {moodNumber(itemIndex)} {item.title.replace("THE ", "")}
                    </button>
                  ))}
                </div>
                <button type="button" className="switcher-arrow" onClick={() => selectMood(nextMood.id, true)} aria-label={`Next mood: ${nextMood.title}`} title="Next mood"><ChevronRight aria-hidden="true" /></button>
              </nav>
            </section>
          );
        })}
      </section>

      <section className="quote-stage" aria-labelledby="buried-emotions-quote">
        <p>Afterword / what the body keeps</p>
        <blockquote id="buried-emotions-quote" className="quote-motion-copy">&quot;Unexpressed emotions will never die. They are buried alive and will come forth later in uglier ways.&quot;</blockquote>
        <div className="quote-context">
          <cite>Sigmund Freud</cite>
          <p>when we experience a painful or socially unacceptable emotion and refuse to process it, the conscious mind pushes it down into the unconscious. Because that emotional energy cannot simply vanish, it festers beneath the surface and eventually &quot;leaks out&quot; as anxiety, physical tension, irritability, or explosive mood swings</p>
        </div>
      </section>

      <section className="about-cortisol" aria-labelledby="about-project-cortisol">
        <p>Project Cortisol</p>
        <h2 id="about-project-cortisol" className="about-motion-copy">An interactive digital space designed to explore and visualize our combined emotional states.</h2>
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
