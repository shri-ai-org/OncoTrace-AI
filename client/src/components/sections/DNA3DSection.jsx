import { useEffect, useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import ErrorBoundary from "../common/ErrorBoundary";
import { DNA3D_HEIGHT_CLASS } from "../../lib/layout";
import { navOffset } from "../../lib/scroll";
import "./DNA3DSection.css";
import useMediaQuery, { REDUCED_MOTION_QUERY } from "../../hooks/useMediaQuery";

// Some older mobile browsers / in-app webviews have no WebGL at all; creating
// a <Canvas> there throws synchronously. Check before ever mounting one.
function hasWebGL() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────
   Scroll store — lerped for silky-smooth motion
   ───────────────────────────────────────────── */
const scrollStore = { target: 0, current: 0 };

/* ── Panel data ── */
const PANELS = [
  {
    tag: "01 — Liquid Biopsy",
    title: "Non-Invasive\nMonitoring",
    body: "Leveraging Liquid Biopsy as a non-invasive method to capture real-time biological signals, enabling continuous cancer tracking without repeated invasive procedures.",
  },
  {
    tag: "02 — AI Core",
    title: "Intelligent\nAnalysis",
    body: "Artificial Intelligence analyzes complex biological data, identifies patterns, and generates meaningful insights for precision monitoring in oncology.",
  },
  {
    tag: "03 — Real-Time",
    title: "Precision\nTracking",
    body: "Real-time precision monitoring of cancer progression, helping clinicians and patients understand how the disease evolves over time.",
  },
  {
    tag: "04 — Open Source",
    title: "Global\nCollab",
    body: "Built as an open-source, not-for-profit platform, ensuring accessibility, transparency, and collaborative innovation across the global oncology ecosystem.",
  },
  {
    tag: "05 — Impact",
    title: "Empowering\nDecisions",
    body: "Empowering better decision-making through reliable, data-driven insights for clinicians, researchers, patients, and pharmaceutical companies.",
  },
];

const LERP_FACTOR = 0.065;
const MODEL_URL = "/DNA_STRAND_NEW.glb";

/* ── 3-D DNA Model ── */
function DNAModel({ reducedMotion }) {
  const { scene } = useGLTF(MODEL_URL);
  const groupRef = useRef();

  const pivot = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const s = 13.5 / Math.max(size.x, size.y, size.z);
    clone.position.set(-center.x, -center.y, -center.z);

    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.setScalar(s);
    wrapper.rotation.set(0, 0, Math.PI / 2);

    clone.traverse((n) => {
      if (n.isMesh && n.material) {
        n.material = n.material.clone();
        n.material.color = new THREE.Color("#60a5fa");
        n.material.envMapIntensity = 0.3;
        n.material.roughness = 0.25;
        n.material.metalness = 0.75;
        n.material.needsUpdate = true;
      }
    });

    return wrapper;
  }, [scene]);

  // On unmount, free this mount's cloned materials and drop the loader's
  // cached glTF. The cache is module-level: its shared geometry kept every
  // previous renderer (and with it the old canvas and the whole previous
  // page) alive after each visit to another route.
  useEffect(() => () => {
    pivot.traverse((n) => { if (n.isMesh) n.material?.dispose?.(); });
    useGLTF.clear(MODEL_URL);
  }, [pivot]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const idle = reducedMotion ? 0 : clock.elapsedTime * 0.25;
    groupRef.current.rotation.y = idle + scrollStore.current * Math.PI * 4;
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      <primitive object={pivot} />
    </group>
  );
}

/* ── Loader spinner ── */
function Loader() {
  const ref = useRef();
  useFrame((_, d) => {
    if (ref.current) {
      ref.current.rotation.x += d;
      ref.current.rotation.y += d * 1.3;
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#60a5fa" wireframe />
    </mesh>
  );
}

/* ═════════════════════════════════════════════
   MAIN EXPORT
   ═════════════════════════════════════════════ */
export default function DNA3DSection() {
  const sectionRef = useRef();
  const headingRef = useRef();
  const scrollHintRef = useRef();
  const textTrackRef = useRef();
  const offsetsRef = useRef({ start: 0, end: 0, computed: false });
  const [canRender3D] = useState(hasWebGL);
  const [load3D, setLoad3D] = useState(false);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  // The WebGL canvas renders every frame while mounted; stop its frame loop
  // whenever the section is off screen so it costs nothing while visitors
  // read the rest of the page.
  const [onScreen, setOnScreen] = useState(false);

  // Don't fetch the 4.6 MB model until the section is actually within reach —
  // otherwise every visitor pays for it immediately on page load.
  useEffect(() => {
    if (!canRender3D) return;
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setLoad3D(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoad3D(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canRender3D]);

  useEffect(() => {
    /* ───────────────────────────────────────────
       Measure panel positions & compute start/end
       translateX values.
       • Desktop (2 panels fit): center panels 1&2
         at start, panels 4&5 at end.
       • Mobile  (only 1 fits): center panel 1
         at start, panel 5 at end.
       ─────────────────────────────────────────── */
    const computeOffsets = () => {
      const trackEl = textTrackRef.current;
      if (!trackEl) return;
      const children = trackEl.children;
      const n = children.length;
      if (n < 1) return;

      // Reset transform so getBoundingClientRect gives natural positions
      const prevTransform = trackEl.style.transform;
      trackEl.style.transform = "translate3d(0,0,0)";
      void trackEl.offsetHeight; // force synchronous reflow

      const vw = window.innerWidth;
      const trackRect = trackEl.getBoundingClientRect();

      // Measure every panel relative to the track's left edge
      const rects = Array.from(children).map((child) => {
        const r = child.getBoundingClientRect();
        return {
          left: r.left - trackRect.left,
          right: r.right - trackRect.left,
          width: r.width,
        };
      });

      // Can two panels sit side-by-side comfortably?
      const firstTwoSpan =
        n >= 2 ? rects[1].right - rects[0].left : rects[0].width;
      const canFitTwo = n >= 2 && firstTwoSpan <= vw * 0.92;

      let startX;
      let endX;

      if (canFitTwo) {
        // ── Desktop: center first two / last two ──
        const startSpan = rects[1].right - rects[0].left;
        startX = (vw - startSpan) / 2 - rects[0].left;

        const endSpan = rects[n - 1].right - rects[n - 2].left;
        endX = (vw - endSpan) / 2 - rects[n - 2].left;
      } else {
        // ── Mobile: center single first / single last ──
        startX = (vw - rects[0].width) / 2 - rects[0].left;
        endX = (vw - rects[n - 1].width) / 2 - rects[n - 1].left;
      }

      offsetsRef.current = { start: startX, end: endX, computed: true };

      // Restore previous transform (animation loop overwrites next frame)
      trackEl.style.transform = prevTransform || "";
    };

    computeOffsets();

    // The progress store is module-level (the 3D model reads it); start from
    // the real scroll position on every mount instead of last visit's value,
    // which made the text track slide backwards on returning to the page.
    scrollStore.target = 0;
    scrollStore.current = 0;
    let snapped = false;

    /* ── Scroll → progress 0-1 ── */
    // The sticky stage sits below the fixed navbar (top: var(--nav-h)), so
    // progress runs from "section top reaches the navbar" to "section end".
    const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 0;
    const onScroll = () => {
      if (!sectionRef.current || !visible) return;
      const r = sectionRef.current.getBoundingClientRect();
      const nh = navH();
      const scrollable = r.height - (window.innerHeight - nh);
      if (scrollable <= 0) return;
      const scrolled = Math.max(0, nh - r.top);
      scrollStore.target = Math.max(0, Math.min(1, scrolled / scrollable));
    };

    /* ── Animation loop (runs only while the section is on screen) ── */
    let raf = 0;
    let visible = false;
    const animate = () => {
      const diff = scrollStore.target - scrollStore.current;
      if (Math.abs(diff) > 0.00001) {
        scrollStore.current += diff * LERP_FACTOR;
      } else {
        scrollStore.current = scrollStore.target;
      }

      const progress = scrollStore.current;

      // Fade heading
      if (headingRef.current) {
        headingRef.current.style.opacity = String(
          Math.max(0, 1 - progress * 5)
        );
      }

      // Fade scroll hint
      if (scrollHintRef.current) {
        scrollHintRef.current.style.opacity = String(
          Math.max(0, 1 - progress * 8)
        );
      }

      // Slide text track: lerp from startX → endX
      if (textTrackRef.current && offsetsRef.current.computed) {
        const { start, end } = offsetsRef.current;
        const x = start + progress * (end - start);
        textTrackRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
      }

      raf = visible ? requestAnimationFrame(animate) : 0;
    };

    // The navbar and the gap a section jump leaves below it (navOffset) don't
    // count as on screen: a jump to the next section (#mammogram) parks this
    // section's last pixels there, an empty strip of the stage where the 3D
    // canvas would otherwise keep rendering every frame. One extra pixel,
    // because a target that only touches the root's edge still intersects.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setOnScreen(visible);
      if (visible) {
        onScroll();
        if (!snapped) {
          scrollStore.current = scrollStore.target;
          snapped = true;
        }
        if (!raf) raf = requestAnimationFrame(animate);
      }
    }, { rootMargin: `-${Math.ceil(navOffset()) + 1}px 0px 0px 0px` });
    io.observe(sectionRef.current);

    /* ── Resize → recompute everything ── */
    const onResize = () => {
      computeOffsets();
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className={`relative ${DNA3D_HEIGHT_CLASS}`}>
      {/* ─── sticky viewport ─── */}
      <div className="sticky top-[var(--nav-h)] h-[calc(100dvh-var(--nav-h))] overflow-hidden bg-white">
        {/* ── ambient glows ── */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 h-[700px] w-[700px]
                       -translate-x-1/2 -translate-y-1/2
                       rounded-full bg-blue-100/50 blur-[160px]"
          />
          <div
            className="absolute left-[28%] top-[30%]
                       h-[350px] w-[350px]
                       rounded-full bg-blue-200/30 blur-[120px]"
          />
        </div>

        {/* ══════════════════════════════════════
            HEADING
            ══════════════════════════════════════ */}
        <div
          ref={headingRef}
          className="dna-heading absolute inset-x-0 top-0 z-30 px-4 pt-6
                     text-center sm:pt-8 lg:pt-10"
        >
          <p className="ot-kicker">
            Liquid Biopsy meets Artificial Intelligence
          </p>
          <h2 className="ot-h2 mt-3">
            Real-Time <span className="text-brand">Precision</span> Monitoring
          </h2>

        </div>

        {/* ── scroll hint ── */}
        <div
          ref={scrollHintRef}
          className="dna-hint pointer-events-none absolute inset-x-0 bottom-4
                     z-30 flex select-none flex-col items-center gap-1.5
                     sm:bottom-6 sm:gap-2"
        >
          <span className="ot-tech uppercase tracking-[0.2em] text-muted">
            Scroll
          </span>
          <svg
            width="14"
            height="22"
            viewBox="0 0 16 24"
            fill="none"
            className="text-hairline-strong"
            aria-hidden="true"
          >
            <rect
              x="1"
              y="1"
              width="14"
              height="22"
              rx="7"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle
              cx="8"
              cy="7"
              r="1.5"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* ══════════════════════════════════════
            TEXT TRACK — z-[5] (behind canvas)
            ══════════════════════════════════════ */}
        <div
          className="dna-track pointer-events-none absolute inset-0 z-[5]
                     flex select-none items-center overflow-hidden
                     pt-[4vh]
                     [mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_94%,transparent_100%)]
                     [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_94%,transparent_100%)]"
        >
          <div
            ref={textTrackRef}
            className="flex items-center gap-[clamp(3rem,8vw,12rem)]
                       will-change-transform"
          >
            {PANELS.map((panel, i) => (
              <div
                key={i}
                className="w-[clamp(260px,80vw,580px)] flex-shrink-0
                           px-4 sm:px-6"
              >
                <span className="dna-tag ot-tech mb-3 block uppercase tracking-[0.12em] text-brand sm:mb-4">
                  {panel.tag}
                </span>
                <h3
                  className="dna-title whitespace-pre-line text-[1.875rem] font-[650]
                             leading-[1.02] tracking-[-0.04em] text-ink-2
                             sm:text-5xl md:text-6xl lg:text-[4.75rem]"
                >
                  {panel.title}
                </h3>
                <span className="dna-rule my-4 block h-[2px] w-10 rounded-full bg-brand sm:my-5" aria-hidden="true" />
                <p className="max-w-[320px] text-[0.875rem] leading-relaxed text-muted sm:max-w-[360px] md:text-[0.9375rem]">
                  {panel.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            3-D CANVAS — z-[10] (above text track)
            ══════════════════════════════════════ */}
        <div
          className="pointer-events-none absolute inset-0 z-[10]
                     flex items-center justify-center"
        >
          <div className="relative h-full w-full">
            {canRender3D && load3D && (
              // If WebGL context creation fails at runtime, or the model
              // fails to fetch/parse, this only drops the 3D model — it
              // must never take the rest of the page down with it.
              <ErrorBoundary fallback={null}>
                <Canvas
                  frameloop={onScreen ? "always" : "never"}
                  camera={{ position: [0, 0, 20], fov: 50 }}
                  dpr={[1, 2]}
                  className="!bg-transparent"
                  gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance",
                    toneMapping: THREE.NoToneMapping,
                  }}
                >
                  <Suspense fallback={<Loader />}>
                    <ambientLight intensity={1.1} />
                    <directionalLight
                      position={[5, 8, 5]}
                      intensity={2.4}
                      color="#ffffff"
                    />
                    <directionalLight
                      position={[-4, -3, 6]}
                      intensity={1.0}
                      color="#93c5fd"
                    />
                    <pointLight
                      position={[-6, 4, 4]}
                      intensity={0.8}
                      color="#60a5fa"
                    />
                    <pointLight
                      position={[6, -4, -3]}
                      intensity={0.5}
                      color="#818cf8"
                    />
                    <pointLight
                      position={[0, -8, 2]}
                      intensity={0.4}
                      color="#22d3ee"
                    />
                    <pointLight
                      position={[0, 8, -2]}
                      intensity={0.5}
                      color="#dbeafe"
                    />
                    <DNAModel reducedMotion={reducedMotion} />
                  </Suspense>
                </Canvas>
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>
    </section>
  );
} 