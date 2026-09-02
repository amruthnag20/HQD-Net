/**
 * Computational field geometry — single source of truth for the signature
 * CLASSICAL → QUANTUM → CLASSICAL visual. viewBox 0 0 1400 800.
 *
 * Design intent: the field is NOT a symmetric circuit board. It is a sparse,
 * deliberate schematic where classical zones converge asymmetrically toward
 * the central quantum cluster, and diverge back out on the right. The signal
 * path (Royal Blue) travels the full journey — this is the page's signature visual.
 *
 * Zones (left-to-right):
 *   classical-in  x: 0–380
 *   transition-in x: 380–480  (convergence paths, no standalone nodes)
 *   quantum       x: 480–920  (the focal cluster — wider than before)
 *   transition-out x: 920–1020
 *   classical-out x: 1020–1400
 */

export type FieldNode = { x: number; y: number }
export type FieldLine = [FieldNode, FieldNode]

export const VIEWBOX = { width: 1400, height: 800 }

/* ---- Classical-in nodes — sparse grid, not symmetrical ---- */
export const classicalInNodes: FieldNode[] = [
  { x: 60,  y: 130 }, // 0 — top far left
  { x: 140, y: 280 }, // 1
  { x: 80,  y: 460 }, // 2
  { x: 220, y: 80  }, // 3 — high
  { x: 300, y: 400 }, // 4
  { x: 180, y: 580 }, // 5 — low
  { x: 340, y: 230 }, // 6 — convergence approach
  { x: 360, y: 560 }, // 7 — convergence approach low
]

/* ---- Classical-out nodes — mirrored but slightly offset for asymmetry ---- */
export const classicalOutNodes: FieldNode[] = [
  { x: 1340, y: 150 },
  { x: 1260, y: 290 },
  { x: 1320, y: 500 },
  { x: 1180, y: 70  },
  { x: 1100, y: 430 },
  { x: 1220, y: 630 },
  { x: 1060, y: 260 }, // convergence exit near-node
  { x: 1040, y: 560 }, // convergence exit low near-node
]

/* ---- Quantum cluster — 8 nodes, wider, with proper interference pattern ---- */
export const quantumNodes: FieldNode[] = [
  { x: 560,  y: 240 }, // 0 upper-left
  { x: 680,  y: 190 }, // 1 upper-center
  { x: 800,  y: 250 }, // 2 upper-right
  { x: 600,  y: 370 }, // 3 mid-left
  { x: 700,  y: 400 }, // 4 center (primary focal node)
  { x: 820,  y: 360 }, // 5 mid-right
  { x: 640,  y: 510 }, // 6 lower-left
  { x: 770,  y: 540 }, // 7 lower-right
]

/* ---- Classical-in orthogonal connectors ---- */
export const classicalInPaths: FieldLine[] = [
  [classicalInNodes[0], classicalInNodes[1]],
  [classicalInNodes[0], classicalInNodes[3]],
  [classicalInNodes[1], classicalInNodes[2]],
  [classicalInNodes[1], classicalInNodes[6]],
  [classicalInNodes[2], classicalInNodes[5]],
  [classicalInNodes[3], classicalInNodes[6]],
  [classicalInNodes[4], classicalInNodes[5]],
  [classicalInNodes[4], classicalInNodes[7]],
  [classicalInNodes[6], classicalInNodes[7]],
]

/* ---- Convergence paths: classical-in → quantum (diagonal bridges) ---- */
export const convergenceInPaths: FieldLine[] = [
  [classicalInNodes[6], quantumNodes[0]],
  [classicalInNodes[6], quantumNodes[3]],
  [classicalInNodes[7], quantumNodes[6]],
]

/* ---- Quantum cluster connections — crossing lines create interference pattern ---- */
export const quantumPaths: FieldLine[] = [
  [quantumNodes[0], quantumNodes[1]],
  [quantumNodes[1], quantumNodes[2]],
  [quantumNodes[0], quantumNodes[3]],
  [quantumNodes[1], quantumNodes[4]],
  [quantumNodes[2], quantumNodes[5]],
  [quantumNodes[3], quantumNodes[4]],
  [quantumNodes[4], quantumNodes[5]],
  [quantumNodes[3], quantumNodes[6]],
  [quantumNodes[4], quantumNodes[7]],
  [quantumNodes[5], quantumNodes[7]],
  [quantumNodes[6], quantumNodes[7]],
  // crossing diagonals — the interference signature
  [quantumNodes[0], quantumNodes[4]],
  [quantumNodes[2], quantumNodes[4]],
  [quantumNodes[1], quantumNodes[6]],
]

/* ---- Divergence paths: quantum → classical-out ---- */
export const convergenceOutPaths: FieldLine[] = [
  [quantumNodes[2], classicalOutNodes[6]],
  [quantumNodes[5], classicalOutNodes[6]],
  [quantumNodes[7], classicalOutNodes[7]],
]

/* ---- Classical-out orthogonal connectors ---- */
export const classicalOutPaths: FieldLine[] = [
  [classicalOutNodes[0], classicalOutNodes[1]],
  [classicalOutNodes[0], classicalOutNodes[3]],
  [classicalOutNodes[1], classicalOutNodes[2]],
  [classicalOutNodes[1], classicalOutNodes[6]],
  [classicalOutNodes[2], classicalOutNodes[5]],
  [classicalOutNodes[3], classicalOutNodes[6]],
  [classicalOutNodes[4], classicalOutNodes[5]],
  [classicalOutNodes[4], classicalOutNodes[7]],
  [classicalOutNodes[6], classicalOutNodes[7]],
]

/**
 * Signal waypoints — the Royal Blue dot travels this path.
 * Tagged by zone so the GSAP timeline knows when to flash.
 * This is the CLASSICAL → QUANTUM → CLASSICAL journey.
 */
export const signalWaypoints: {
  node: FieldNode
  zone: 'classical-in' | 'quantum' | 'classical-out'
}[] = [
  { node: classicalInNodes[3], zone: 'classical-in' },
  { node: classicalInNodes[0], zone: 'classical-in' },
  { node: classicalInNodes[1], zone: 'classical-in' },
  { node: classicalInNodes[6], zone: 'classical-in' },
  { node: quantumNodes[0],     zone: 'quantum' },
  { node: quantumNodes[1],     zone: 'quantum' },
  { node: quantumNodes[4],     zone: 'quantum' }, // center — pause here
  { node: quantumNodes[2],     zone: 'quantum' },
  { node: quantumNodes[5],     zone: 'quantum' },
  { node: classicalOutNodes[6], zone: 'classical-out' },
  { node: classicalOutNodes[1], zone: 'classical-out' },
  { node: classicalOutNodes[0], zone: 'classical-out' },
  { node: classicalOutNodes[3], zone: 'classical-out' },
]

/**
 * Probability radiants — faint dashed lines that extend outward from the
 * quantum center node, representing quantum uncertainty / superposition.
 * Drawn with stroke-dasharray so they feel like probability fields.
 */
export const probabilityRadiants: FieldLine[] = [
  [quantumNodes[4], { x: 700, y: 80  }], // up
  [quantumNodes[4], { x: 480, y: 640 }], // lower-left
  [quantumNodes[4], { x: 920, y: 660 }], // lower-right
  [quantumNodes[4], { x: 430, y: 300 }], // upper-left
  [quantumNodes[4], { x: 970, y: 280 }], // upper-right
]

/* ---- Entanglement threads — organic motion metadata ----
 *
 * The hero field renders its connectors as soft bowed bezier "threads"
 * rather than rigid orthogonal circuit traces. Each thread gets a stable,
 * deterministic (not truly random — seeded by index) bow/amplitude/frequency/
 * phase so the field has a consistent identity across reloads while still
 * breathing continuously once mounted.
 */
export type ThreadMeta = {
  /** Rest-state perpendicular offset of the curve's control point. */
  bow: number
  /** How far the bow oscillates from rest, per frame. */
  amp: number
  /** Oscillation speed (radians/sec). */
  freq: number
  /** Phase offset so threads don't breathe in lockstep. */
  phase: number
}

/** Deterministic pseudo-random unit value in [0, 1), seeded by index. */
function seededUnit(index: number): number {
  const seed = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return seed - Math.floor(seed)
}

export function threadMeta(index: number, baseBow: number): ThreadMeta {
  const unit = seededUnit(index)
  return {
    bow: baseBow,
    amp: 5 + unit * 11,
    freq: 0.12 + unit * 0.22,
    phase: unit * Math.PI * 2,
  }
}

/**
 * Quadratic bezier "thread" path between two nodes, bowed perpendicular to
 * the connecting line by `bow` units. This is what turns rigid connectors
 * into soft, organic strands.
 */
export function threadPath(a: FieldNode, b: FieldNode, bow: number): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const cx = mx + nx * bow
  const cy = my + ny * bow
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}
