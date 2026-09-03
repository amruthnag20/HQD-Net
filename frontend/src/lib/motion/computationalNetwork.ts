/**
 * Pure data/generation layer for the Living Computational Background.
 * No DOM, no canvas, no GSAP — just deterministic topology generation and
 * the per-tier presets that the renderer (LivingComputationalBackground)
 * reads every frame. Kept separate so the simulation math is testable and
 * the renderer stays focused on drawing.
 */

export type NetworkNode = {
  id: number
  /** Normalized (0..1) anchor position — the node's "home" in the topology. */
  anchorX: number
  anchorY: number
  /** Normalized (0..1) current rendered position, anchor + organic drift. */
  x: number
  y: number
  radius: number
  /** Stable random 0..1 — nodes are revealed in priority order as intensity rises. */
  priority: number
  /** True for the restrained subset of nodes that render as Powder Blue. */
  isSecondary: boolean
  driftAmpX: number
  driftAmpY: number
  driftFreqX: number
  driftFreqY: number
  driftPhaseX: number
  driftPhaseY: number
  opacity: number
  targetOpacity: number
  /** 0..1, bumped when a signal arrives/departs, decays back to 0. */
  activity: number
}

export type NetworkLink = {
  a: number
  b: number
  /** max(endpoint priorities) — a link only appears once both ends are visible. */
  priority: number
  /** Stable random variance so links aren't visually uniform. */
  weight: number
  dormant: boolean
  opacity: number
  targetOpacity: number
}

export type NetworkTopology = {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

export type IntensityTier = 'low' | 'medium' | 'medium-high' | 'high'

export type IntensityPreset = {
  /** Priority threshold (0..1) — nodes/links at or below this are shown. */
  inclusion: number
  baseNodeOpacity: number
  baseLinkOpacity: number
  signalIntervalMin: number
  signalIntervalMax: number
  driftScale: number
}

export const INTENSITY_PRESETS: Record<IntensityTier, IntensityPreset> = {
  low: {
    inclusion: 0.34,
    baseNodeOpacity: 0.16,
    baseLinkOpacity: 0.07,
    signalIntervalMin: 5,
    signalIntervalMax: 10,
    driftScale: 0.6,
  },
  medium: {
    inclusion: 0.58,
    baseNodeOpacity: 0.2,
    baseLinkOpacity: 0.09,
    signalIntervalMin: 3.5,
    signalIntervalMax: 7,
    driftScale: 0.8,
  },
  'medium-high': {
    inclusion: 0.78,
    baseNodeOpacity: 0.24,
    baseLinkOpacity: 0.11,
    signalIntervalMin: 2.5,
    signalIntervalMax: 5.5,
    driftScale: 0.9,
  },
  high: {
    inclusion: 1,
    baseNodeOpacity: 0.3,
    baseLinkOpacity: 0.14,
    signalIntervalMin: 1.6,
    signalIntervalMax: 3.6,
    driftScale: 1,
  },
}

export type DensityTier = 'mobile' | 'tablet' | 'desktop'

export function getDensityTier(width: number): DensityTier {
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

const NODE_COUNT: Record<DensityTier, number> = {
  mobile: 16,
  tablet: 26,
  desktop: 42,
}

const CLUSTER_COUNT: Record<DensityTier, number> = {
  mobile: 3,
  tablet: 4,
  desktop: 6,
}

/** Deterministic seeded PRNG (mulberry32) — controlled, reproducible randomness. */
function mulberry32(seed: number) {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function anchorDistance(
  a: { anchorX: number; anchorY: number },
  b: { anchorX: number; anchorY: number },
): number {
  const dx = a.anchorX - b.anchorX
  const dy = a.anchorY - b.anchorY
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Generates one topology for a density tier. Deterministic per tier (stable
 * seed) so regenerating on a tier change doesn't look random between visits —
 * the network has a consistent identity, it just reveals more of itself as
 * density/intensity increases.
 */
export function generateTopology(densityTier: DensityTier): NetworkTopology {
  const seed = densityTier === 'mobile' ? 17 : densityTier === 'tablet' ? 53 : 97
  const random = mulberry32(seed)
  const count = NODE_COUNT[densityTier]
  const clusterCount = CLUSTER_COUNT[densityTier]

  const clusters = Array.from({ length: clusterCount }, () => ({
    x: 0.12 + random() * 0.76,
    y: 0.12 + random() * 0.76,
    pull: 0.55 + random() * 0.3,
  }))

  const nodes: NetworkNode[] = Array.from({ length: count }, (_, id) => {
    const cluster = clusters[Math.floor(random() * clusters.length)]
    const spread = 1 - cluster.pull
    const anchorX = clamp01(cluster.x + (random() - 0.5) * spread * 0.9)
    const anchorY = clamp01(cluster.y + (random() - 0.5) * spread * 0.9)
    return {
      id,
      anchorX,
      anchorY,
      x: anchorX,
      y: anchorY,
      radius: 1.6 + random() * 1.8,
      priority: random(),
      isSecondary: random() < 0.3,
      driftAmpX: 0.01 + random() * 0.018,
      driftAmpY: 0.01 + random() * 0.018,
      driftFreqX: 0.025 + random() * 0.045,
      driftFreqY: 0.025 + random() * 0.045,
      driftPhaseX: random() * Math.PI * 2,
      driftPhaseY: random() * Math.PI * 2,
      opacity: 0,
      targetOpacity: 0,
      activity: 0,
    }
  })

  const links: NetworkLink[] = []
  const seenPairs = new Set<string>()
  const addLink = (a: number, b: number, weight: number) => {
    if (a === b) return
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seenPairs.has(key)) return
    seenPairs.add(key)
    links.push({
      a,
      b,
      priority: Math.max(nodes[a].priority, nodes[b].priority),
      weight,
      dormant: false,
      opacity: 0,
      targetOpacity: 0,
    })
  }

  nodes.forEach((node, i) => {
    const ranked = nodes
      .map((other, j) => ({ j, d: j === i ? Infinity : anchorDistance(node, other) }))
      .sort((x, y) => x.d - y.d)

    const roll = random()
    const neighborCount = roll < 0.15 ? 0 : roll < 0.3 ? 1 : 2 + Math.floor(random() * 2)
    for (let k = 0; k < neighborCount && k < ranked.length; k++) {
      if (random() < 0.82) addLink(i, ranked[k].j, random())
    }
  })

  // A handful of deliberate long-range connections for visual variety.
  const longRangeCount = Math.round(count * 0.08)
  for (let i = 0; i < longRangeCount; i++) {
    addLink(Math.floor(random() * count), Math.floor(random() * count), 0.3 + random() * 0.4)
  }

  return { nodes, links }
}
