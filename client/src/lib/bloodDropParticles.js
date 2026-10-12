/* Particle blood drop: geometry, deterministic particle generation, and a
   batched 2D-canvas renderer. Pure functions, no React: the hero's
   BloodDropParticles component owns the canvas, sizing and scroll wiring.

   Units: particle positions are in "drop units", where the drop is 1 tall,
   its tip at y = 0 and the bottom of its bulb at y = 1, centred on x = 0. */

/* Seeded PRNG (mulberry32): the same seed and count always give the same
   particles, so the formation is stable across renders, resizes and scroll
   direction. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x0c7a_ce;

/* ── Silhouette ──────────────────────────────────────────────────────────
   The classic teardrop curve x = sin t · sinᵐ(t/2), y = cos t, flipped so the
   tip points up. m = 2 gives a fine tip with slightly concave shoulders and a
   round bulb, about 0.65 as wide as it is tall, widest at 75% of its height. */
const M = 2;
const TAU = Math.PI * 2;

/** Half-width of the drop (drop units) at height y in [0, 1]. */
export function halfWidth(y) {
  if (y <= 0 || y >= 1) return 0;
  const t = Math.acos(1 - 2 * y);
  return 0.5 * Math.sin(t) * Math.pow(Math.sin(t / 2), M);
}

/** Outline as a polyline from the tip down the right side and back up. */
function outline(steps = 360) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU;
    pts.push({ x: 0.5 * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), M), y: (1 - Math.cos(t)) / 2 });
  }
  return pts;
}

/* Tone ramp, darkest to the restrained highlight: deep burgundy to crimson. */
export const TONES = ["#4a0a14", "#7a0f22", "#9b1028", "#c01f37", "#e2566b"];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Light from the upper left, toward the viewer.
const LIGHT = (() => {
  const v = [-0.5, -0.62, 0.6];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

/** Generate `count` particles. Deterministic for a given count. */
export function generateParticles(count) {
  const rand = mulberry32(SEED ^ count);
  const rimCount = Math.round(count * 0.3);
  const particles = [];

  // Rim: sampled evenly by arc length, nudged slightly inward. Keeps the
  // silhouette crisp at any size.
  const line = outline();
  const cum = [0];
  for (let i = 1; i < line.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  }
  const total = cum[cum.length - 1];
  for (let k = 0; k < rimCount; k++) {
    const s = ((k + rand() * 0.9) / rimCount) * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const a = line[i - 1], b = line[i];
    const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    // Nudge inward along the outline's normal. The polyline runs clockwise
    // on screen (tip, right side down, bottom, left side up), so the inward
    // normal of a segment (dx, dy) is (-dy, dx).
    const sl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const inset = rand() * 0.012 + rand() * 0.006;
    particles.push(makeParticle(rand, x - ((b.y - a.y) / sl) * inset, y + ((b.x - a.x) / sl) * inset, true));
  }

  // Interior: rejection sampled, slightly denser toward the edge for
  // definition.
  while (particles.length < count) {
    const y = rand();
    const x = (rand() * 2 - 1) * 0.34;
    const hw = halfWidth(y);
    if (Math.abs(x) > hw - 0.004) continue;
    const edge = hw > 0 ? Math.abs(x) / hw : 1;
    if (rand() > 0.72 + 0.28 * edge * edge) continue;
    particles.push(makeParticle(rand, x, y, false));
  }
  return particles;
}

function makeParticle(rand, x, y, rim) {
  // Shading: treat the bulb as a sphere (centre 0, 0.7) and light it.
  const nx = x / 0.34;
  const ny = (y - 0.7) / 0.4;
  const r2 = Math.min(0.97, nx * nx + ny * ny);
  const nz = Math.sqrt(1 - r2);
  const lambert = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  let tone = Math.min(3, Math.max(0, Math.floor(lambert * 4.1 - (rim ? 0.6 : 0) + (rand() - 0.5) * 0.9)));
  const highlight = lambert > 0.9 && y > 0.48 && rand() < 0.55;
  if (highlight) tone = 4;

  // Release order: right and upper particles leave first, with noise, so the
  // drop sheds toward the right instead of fading as one block.
  const score = 0.55 * (x / 0.33) + 0.35 * (1 - y) + 0.5 * (rand() - 0.5);
  const u = clamp01((score + 0.8) / 1.75);
  const release = 0.04 + 0.5 * (1 - u);
  const span = 0.3 + 0.12 * rand();

  // Flight: mostly right and a little up (screen y points down), plus an
  // outward push from the drop's centre.
  const theta = ((-20 + 35 * (rand() * 2 - 1)) * Math.PI) / 180;
  const rx = x, ry = y - 0.62;
  const rl = Math.hypot(rx, ry) || 1;
  let dx = 0.8 * Math.cos(theta) + 0.45 * (rx / rl);
  let dy = 0.8 * Math.sin(theta) + 0.45 * (ry / rl);
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl; dy /= dl;
  const dist = 0.6 + 1.2 * rand();

  const introAngle = rand() * TAU;
  const introDist = 0.04 + 0.1 * rand();

  return {
    x, y, tone,
    size: highlight ? 0.55 + 0.45 * rand() : 0.6 + 1.1 * Math.pow(rand(), 1.6),
    alpha: rim ? 0.8 + 0.2 * rand() : 0.55 + 0.45 * rand(),
    release, span,
    dx, dy, dist,
    swirl: (rand() - 0.5) * 0.35,
    phase: rand() * TAU,
    freq: 0.6 + 0.9 * rand(),
    amp: 0.0022 + 0.0035 * rand(),
    ix: Math.cos(introAngle) * introDist,
    iy: Math.sin(introAngle) * introDist,
    idelay: rand() * 0.35,
  };
}

/** Particles have fully left by this progress. */
export const DISPERSED_AT = 0.97;

const ALPHA_LEVELS = 8;
const paths = Array.from({ length: TONES.length * ALPHA_LEVELS }, () => null);

/**
 * Draw one frame.
 * state: { width, height (CSS px), dpr, cx, top, size (drop height, px),
 *          dotScale, p (scroll progress 0..1), time (s),
 *          intro (0..1, 1 = done), still (true under reduced motion) }
 */
export function renderFrame(ctx, particles, state) {
  const { width, height, dpr, cx, top, size, dotScale = 1, p, time, intro, still } = state;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (p >= DISPERSED_AT) return;

  for (let i = 0; i < paths.length; i++) paths[i] = null;

  // Suspended response as scrolling begins: the drop lifts and stretches a
  // touch before particles start to leave.
  const settle = smoothstep(0, 0.12, p);
  const lift = -0.035 * size * settle;
  const sy = 1 + 0.02 * settle;
  const sx = 1 - 0.01 * settle;

  for (let i = 0; i < particles.length; i++) {
    const q = particles[i];
    const local = clamp01((p - q.release) / q.span);
    const e = easeInOutCubic(local);
    let a = q.alpha * (1 - smoothstep(0.55, 1, local));

    let x = q.x * sx;
    let y = (q.y - 0.62) * sy + 0.62;

    if (!still) {
      // Idle shimmer, stronger just before a particle lets go ("tension").
      const tension = smoothstep(q.release - 0.06, q.release, p) * (1 - local);
      const amp = q.amp * (1 + 2.2 * tension);
      x += amp * Math.sin(time * q.freq + q.phase);
      y += amp * Math.cos(time * q.freq * 0.83 + q.phase * 1.7);

      if (intro < 1) {
        const k = 1 - easeOutCubic(clamp01((intro - q.idelay) / (1 - q.idelay)));
        x += q.ix * k;
        y += q.iy * k;
        a *= 1 - k;
      }
    }

    if (e > 0) {
      const d = q.dist * e;
      const curve = q.swirl * q.dist * Math.sin(Math.PI * e);
      x += q.dx * d - q.dy * curve;
      y += q.dy * d + q.dx * curve;
    }

    if (a < 0.02) continue;
    const px = cx + x * size;
    const py = top + y * size + lift;
    if (px < -4 || py < -4 || px > width + 4 || py > height + 4) continue;

    const r = q.size * dotScale * (1 + 0.4 * e);
    const level = Math.min(ALPHA_LEVELS - 1, Math.floor(a * ALPHA_LEVELS));
    const idx = q.tone * ALPHA_LEVELS + level;
    let path = paths[idx];
    if (!path) path = paths[idx] = new Path2D();
    path.moveTo(px + r, py);
    path.arc(px, py, r, 0, TAU);
  }

  for (let t = 0; t < TONES.length; t++) {
    ctx.fillStyle = TONES[t];
    for (let l = 0; l < ALPHA_LEVELS; l++) {
      const path = paths[t * ALPHA_LEVELS + l];
      if (!path) continue;
      ctx.globalAlpha = (l + 0.5) / ALPHA_LEVELS;
      ctx.fill(path);
    }
  }
  ctx.globalAlpha = 1;
}
