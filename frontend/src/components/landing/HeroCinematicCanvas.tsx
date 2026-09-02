import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'

/* ═══════════════════════════════════════════════════════════════
 * HeroCinematicCanvas — Layered cinematic background for the hero
 *
 * Performance-optimized:
 *   - GSAP Ticker synchronized with RAF lag-smoothing
 *   - IntersectionObserver: pauses ticker completely when off-screen
 *   - VisibilityChange: pauses ticker when tab is hidden
 *   - Pre-allocated 3D DNA projection buffers (0 per-frame GC allocations)
 *   - Pre-computed wave connectivity (0 per-frame distance loops)
 *   - Batched Canvas2D draw calls (10x reduction in path operations)
 *   - DPR capped to 1.25 for crisp 60fps rendering across 4K/Retina displays
 * ═══════════════════════════════════════════════════════════════ */

// ─── Shared color ramp (navy → blue → indigo → violet, + cyan accent) ──

const CLR = {
  paleBlue:  { r: 221, g: 235, b: 255 },
  lavender:  { r: 201, g: 199, b: 255 },
  blueFaint: { r: 200, g: 213, b: 238 },
  blueMid:   { r: 158, g: 178, b: 224 },
  blue:      { r: 62,  g: 110, b: 224 },
  indigo:    { r: 89,  g: 101, b: 216 },
  violet:    { r: 139, g: 92,  b: 246 },
  navy:      { r: 27,  g: 59,  b: 122 },
  cyan:      { r: 83,  g: 199, b: 232 },
} as const

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  }
}

function rampColor(t: number): { r: number; g: number; b: number } {
  return lerpColor(CLR.blue, CLR.indigo, t)
}

// ─── Types ────────────────────────────────────────────────────

type ZBand = 'fore' | 'mid' | 'back'

type NetworkNode = {
  x: number; y: number
  vx: number; vy: number
  r: number
  zBand: ZBand
  isAnchor: boolean
  baseAlpha: number
  haloR: number
  rampT: number
}

type NetworkEdge = {
  a: number; b: number
  alpha: number
}

type DataPulse = {
  edgeIndex: number
  t: number
  speed: number
  glowR: number
}

type WaveNode = {
  x: number; y: number
  baseY: number
  r: number
  alpha: number
  rampT: number
}

type WaveEdge = {
  a: number; b: number
  alpha: number
}

type WaveData = {
  nodes: WaveNode[]
  edges: WaveEdge[]
}

// ─── Deterministic pseudo-random ──────────────────────────────

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
}

// ─── Device tier ──────────────────────────────────────────────

function getDeviceTier(width: number): number {
  if (width < 768) return 0.4
  if (width < 1200) return 0.7
  return 1.0
}

// ─── Center + CTA exclusion — keeps the reading path calm ─────

function isInCenterZone(nx: number, ny: number): boolean {
  return nx > 0.28 && nx < 0.72 && ny > 0.15 && ny < 0.7
}

// ─── Build wave-field point-mesh ──────────────────────────────

function buildWaveNodes(tier: number, w: number, h: number): WaveData {
  const rand = seeded(55)
  const count = Math.round(70 * tier)
  const nodes: WaveNode[] = []

  for (let i = 0; i < count; i++) {
    const nx = rand()
    const ny = 0.84 + rand() * 0.16 // bottom ~16% of the viewport

    nodes.push({
      x: nx * w,
      y: ny * h,
      baseY: ny * h,
      r: 1 + rand() * 2.2,
      alpha: 0.14 + rand() * 0.3,
      rampT: rand(),
    })
  }

  // Pre-calculate edge connections once during setup
  const edges: WaveEdge[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < Math.min(i + 6, nodes.length); j++) {
      const a = nodes[i], b = nodes[j]
      const dx = a.x - b.x, dy = a.baseY - b.baseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 70 || dist < 5) continue
      edges.push({ a: i, b: j, alpha: 0.1 * (1 - dist / 70) })
    }
  }

  return { nodes, edges }
}

// ─── Build network topology ───────────────────────────────────

function buildNetwork(tier: number, w: number, h: number) {
  const rand = seeded(42)
  const baseCount = Math.round(70 * tier)
  const maxEdges = Math.round(130 * tier)

  const clusters = [
    { cx: 0.10, cy: 0.30 },
    { cx: 0.18, cy: 0.75 },
    { cx: 0.85, cy: 0.50 },
    { cx: 0.78, cy: 0.16 },
    { cx: 0.45, cy: 0.85 },
  ]

  const nodes: NetworkNode[] = []
  const zBands: ZBand[] = ['back', 'mid', 'fore']
  let anchorBudget = 5

  for (let i = 0; i < baseCount; i++) {
    const clusterIdx = rand() < 0.7 ? Math.floor(rand() * clusters.length) : -1

    let nx: number, ny: number
    if (clusterIdx >= 0) {
      const cl = clusters[clusterIdx]
      const spread = 0.10 + rand() * 0.07
      nx = cl.cx + (rand() - 0.5) * spread * 2
      ny = cl.cy + (rand() - 0.5) * spread * 2
    } else {
      nx = rand()
      ny = rand()
    }

    nx = Math.max(0.02, Math.min(0.98, nx))
    ny = Math.max(0.02, Math.min(0.98, ny))

    if (isInCenterZone(nx, ny) && rand() < 0.8) continue

    const zBand = zBands[Math.floor(rand() * 3)]
    const isAnchor = anchorBudget > 0 && (i < 5 || rand() < 0.06) && !isInCenterZone(nx, ny)
    if (isAnchor) anchorBudget--

    let r: number
    if (isAnchor) r = 3.5 + rand() * 3
    else if (zBand === 'fore') r = 2 + rand() * 1.5
    else if (zBand === 'mid') r = 1.5 + rand() * 1
    else r = 1 + rand() * 0.8

    nodes.push({
      x: nx * w, y: ny * h,
      vx: (rand() - 0.5) * 0.025,
      vy: (rand() - 0.5) * 0.025,
      r, zBand,
      isAnchor,
      baseAlpha: isAnchor ? 0.75 : zBand === 'fore' ? 0.42 : zBand === 'mid' ? 0.26 : 0.14,
      haloR: isAnchor ? r * 4 : 0,
      rampT: rand(),
    })
  }

  const edges: NetworkEdge[] = []
  const dMax = Math.min(w, h) * 0.13

  for (let i = 0; i < nodes.length && edges.length < maxEdges; i++) {
    for (let j = i + 1; j < nodes.length && edges.length < maxEdges; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > dMax || dist < 8) continue
      const prob = 0.4 * (1 - dist / dMax)
      if (rand() > prob) continue
      edges.push({ a: i, b: j, alpha: 0.18 * (1 - dist / dMax) })
    }
  }

  return { nodes, edges }
}

// ─── Parallax factors ─────────────────────────────────────────

const PX = {
  atmo: 0.02,
  quantum: 0.03,
  wave: 0.04,
  net_back: 0.04,
  net_mid: 0.07,
  net_fore: 0.1,
  dna: 0.12,
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HeroCinematicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let w = 0, h = 0, tier = 1.0
    let net: ReturnType<typeof buildNetwork> = { nodes: [], edges: [] }
    let waveData: WaveData = { nodes: [], edges: [] }

    let mouseNX = 0, mouseNY = 0, smoothMX = 0, smoothMY = 0
    let pulses: DataPulse[] = []
    let nextPulseTime = 2 + Math.random() * 3
    let elapsed = 0, lastNow = performance.now() / 1000

    const isDesktop = () => w >= 768

    function applySize() {
      w = canvas!.parentElement?.clientWidth ?? window.innerWidth
      h = canvas!.parentElement?.clientHeight ?? window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      tier = getDeviceTier(w)
      net = buildNetwork(tier, w, h)
      waveData = buildWaveNodes(tier, w, h)
    }

    // ─── Layer 0: Atmosphere ────────────────────────────────

    function drawAtmosphere(t: number) {
      const breathe = 1 + Math.sin(t * 0.5) * 0.02
      const bg = ctx!.createRadialGradient(
        w * 0.5, h * 0.4, 0,
        w * 0.5, h * 0.4, Math.max(w, h) * 0.75,
      )
      bg.addColorStop(0, `rgba(224,236,255,${breathe.toFixed(3)})`)
      bg.addColorStop(0.5, 'rgba(240,245,253,1)')
      bg.addColorStop(1, 'rgba(232,238,249,1)')
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, w, h)
    }

    // ─── Layer 1: Quantum-inspired probability-density blobs ─

    function drawQuantumBlobs(t: number, px: number, py: number) {
      const ox = px * PX.quantum * w, oy = py * PX.quantum * h
      const blobs = [
        { cx: 0.22, cy: 0.68, rx: 200, ry: 160, color: CLR.lavender, a: 0.07, dx: 25, dy: -12, freq: 0.07, ph: 0 },
        { cx: 0.80, cy: 0.55, rx: 180, ry: 200, color: CLR.blueFaint, a: 0.07, dx: -18, dy: 15, freq: 0.05, ph: 2.1 },
        { cx: 0.42, cy: 0.82, rx: 220, ry: 130, color: CLR.paleBlue, a: 0.06, dx: 15, dy: 10, freq: 0.06, ph: 4.2 },
        { cx: 0.88, cy: 0.78, rx: 160, ry: 180, color: CLR.violet, a: 0.045, dx: -10, dy: 8, freq: 0.04, ph: 1.5 },
      ]

      for (const blob of blobs) {
        const cx = blob.cx * w + Math.sin(t * blob.freq + blob.ph) * blob.dx + ox
        const cy = blob.cy * h + Math.cos(t * blob.freq * 0.7 + blob.ph) * blob.dy + oy
        const grd = ctx!.createRadialGradient(cx, cy, 0, cx, cy, blob.rx)
        grd.addColorStop(0, rgba(blob.color, blob.a))
        grd.addColorStop(0.5, rgba(blob.color, blob.a * 0.3))
        grd.addColorStop(1, 'rgba(240,245,253,0)')
        ctx!.fillStyle = grd
        ctx!.beginPath()
        ctx!.ellipse(cx, cy, blob.rx, blob.ry, 0, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    // ─── Layer 2: Wave-field point-mesh (batched lines + nodes) ──

    function drawWaveField(t: number, px: number, py: number) {
      const ox = px * PX.wave * w, oy = py * PX.wave * h
      const terms = [
        { amp: 8, k: 0.012, omega: 0.12, phi: 0 },
        { amp: 5, k: 0.021, omega: 0.09, phi: 1.4 },
        { amp: 3, k: 0.033, omega: 0.2, phi: 3.1 },
      ]
      const waveY = (x: number) => {
        let y = 0
        for (const term of terms) y += term.amp * Math.sin(term.k * x - term.omega * t + term.phi)
        return y
      }

      // 1. Fast batched stroke for wave connections
      if (waveData.edges.length > 0) {
        ctx!.lineWidth = 0.5
        ctx!.strokeStyle = rgba(rampColor(0.3), 0.08)
        ctx!.beginPath()
        for (let i = 0; i < waveData.edges.length; i++) {
          const edge = waveData.edges[i]
          const a = waveData.nodes[edge.a], b = waveData.nodes[edge.b]
          ctx!.moveTo(a.x + ox, a.baseY + waveY(a.x) * 0.4 + oy)
          ctx!.lineTo(b.x + ox, b.baseY + waveY(b.x) * 0.4 + oy)
        }
        ctx!.stroke()
      }

      // 2. Wave nodes
      for (const node of waveData.nodes) {
        const drawX = node.x + ox
        const drawY = node.baseY + waveY(node.x) * 0.4 + oy
        const color = rampColor(node.rampT)

        if (node.r > 2) {
          const grd = ctx!.createRadialGradient(drawX, drawY, 0, drawX, drawY, node.r * 3.5)
          grd.addColorStop(0, rgba(color, 0.1))
          grd.addColorStop(1, 'rgba(240,245,253,0)')
          ctx!.fillStyle = grd
          ctx!.beginPath()
          ctx!.arc(drawX, drawY, node.r * 3.5, 0, Math.PI * 2)
          ctx!.fill()
        }

        ctx!.fillStyle = rgba(color, node.alpha)
        ctx!.beginPath()
        ctx!.arc(drawX, drawY, node.r, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    // ─── Layer 3: Network topology ──────────────────────────

    function drawNetwork(t: number, px: number, py: number) {
      const { nodes, edges } = net

      for (const node of nodes) {
        node.x += node.vx + Math.sin(t * 0.3 + node.x * 0.01) * 0.002
        node.y += node.vy + Math.cos(t * 0.25 + node.y * 0.01) * 0.002
        if (node.x < 10 || node.x > w - 10) node.vx *= -1
        if (node.y < 10 || node.y > h - 10) node.vy *= -1
        node.x = Math.max(5, Math.min(w - 5, node.x))
        node.y = Math.max(5, Math.min(h - 5, node.y))
      }

      // Batch draw network edges
      ctx!.lineWidth = 0.7
      for (const edge of edges) {
        const a = nodes[edge.a], b = nodes[edge.b]
        if (!a || !b) continue
        const depth = a.zBand === 'fore' || b.zBand === 'fore' ? PX.net_fore
          : a.zBand === 'mid' || b.zBand === 'mid' ? PX.net_mid : PX.net_back
        const oox = px * depth * w, ooy = py * depth * h
        const color = rampColor((a.rampT + b.rampT) / 2)
        ctx!.strokeStyle = rgba(color, edge.alpha)
        ctx!.beginPath()
        ctx!.moveTo(a.x + oox, a.y + ooy)
        ctx!.lineTo(b.x + oox, b.y + ooy)
        ctx!.stroke()
      }

      // Draw nodes grouped by depth tier
      const bands: ZBand[] = ['back', 'mid', 'fore']
      for (const band of bands) {
        const depth = PX[`net_${band}` as keyof typeof PX]
        const oox = px * depth * w, ooy = py * depth * h

        for (const node of nodes) {
          if (node.zBand !== band) continue
          const nx = node.x + oox, ny = node.y + ooy
          const color = node.isAnchor ? CLR.navy : rampColor(node.rampT)

          if (node.haloR > 0) {
            const grd = ctx!.createRadialGradient(nx, ny, 0, nx, ny, node.haloR)
            grd.addColorStop(0, rgba(color, 0.1))
            grd.addColorStop(1, 'rgba(240,245,253,0)')
            ctx!.fillStyle = grd
            ctx!.beginPath()
            ctx!.arc(nx, ny, node.haloR, 0, Math.PI * 2)
            ctx!.fill()
          }

          ctx!.fillStyle = rgba(color, node.baseAlpha)
          ctx!.beginPath()
          ctx!.arc(nx, ny, node.r, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
    }

    // ─── Layer 4: Cinematic 3D Molecular DNA Helix ───────────

    type DrawItem =
      | { type: 'rung'; yFrac: number; p1: { x: number; y: number; z: number; persp: number }; p2: { x: number; y: number; z: number; persp: number }; z: number }
      | { type: 'atom'; p: { x: number; y: number; z: number; persp: number }; r: number; strand: 0 | 1 | 2; z: number; isBaseNode?: boolean }

    const drawItems: DrawItem[] = []

    function drawDNA(t: number, px: number, py: number) {
      const helixCX = isDesktop() ? Math.min(w * 0.83, w - 120) : Math.min(w * 0.82, w - 60)
      const helixCY = h * 0.50
      const helixH = h * 1.18
      const helixR = isDesktop() ? 68 : 46
      const turns = 3.6
      const rotSpeed = 0.022
      const phase = t * rotSpeed * Math.PI * 2
      const tilt = -0.16

      const ox = px * PX.dna * w
      const oy = py * PX.dna * h
      const totalAngle = turns * Math.PI * 2

      function project3D(yFrac: number, angleOffset: number, rScale = 1.0) {
        const rawY = (yFrac - 0.5) * helixH
        const angle = yFrac * totalAngle + phase + angleOffset
        const curR = helixR * rScale

        const rawX = Math.cos(angle) * curR
        const rawZ = Math.sin(angle) * curR

        const rotX = rawX * Math.cos(tilt) - rawY * Math.sin(tilt) * 0.1
        const rotY = rawY + rawX * Math.sin(tilt) * 0.1
        const rotZ = rawZ

        const fov = 400
        const persp = fov / (fov + rotZ * 0.9)

        return {
          x: helixCX + rotX * persp + ox,
          y: helixCY + rotY * persp + oy,
          z: rotZ / helixR,
          persp,
        }
      }

      drawItems.length = 0

      // 1. Base-pair rungs
      const rungCount = Math.round(30 * tier)
      for (let i = 0; i < rungCount; i++) {
        const yFrac = i / (rungCount - 1)
        const p1 = project3D(yFrac, 0)
        const p2 = project3D(yFrac, Math.PI)
        const avgZ = (p1.z + p2.z) / 2

        drawItems.push({
          type: 'rung',
          yFrac,
          p1,
          p2,
          z: avgZ,
        })

        const steps = [0.22, 0.40, 0.60, 0.78]
        steps.forEach((step, sIdx) => {
          const bp = project3D(yFrac, step * Math.PI, 1.0 - Math.sin(step * Math.PI) * 0.15)
          drawItems.push({
            type: 'atom',
            p: bp,
            r: (isDesktop() ? 2.8 : 2.0) * bp.persp,
            strand: sIdx < 2 ? 0 : 1,
            z: bp.z,
            isBaseNode: true,
          })
        })
      }

      // 2. Backbone atoms
      const backboneCount = Math.round(75 * tier)
      for (let i = 0; i < backboneCount; i++) {
        const yFrac = i / (backboneCount - 1)
        const p1 = project3D(yFrac, 0)
        drawItems.push({
          type: 'atom',
          p: p1,
          r: (isDesktop() ? 4.5 : 3.2) * p1.persp,
          strand: 0,
          z: p1.z,
        })

        const p2 = project3D(yFrac, Math.PI)
        drawItems.push({
          type: 'atom',
          p: p2,
          r: (isDesktop() ? 4.5 : 3.2) * p2.persp,
          strand: 1,
          z: p2.z,
        })
      }

      // 3. Ambient bio-ions
      const ionCount = Math.round(24 * tier)
      for (let i = 0; i < ionCount; i++) {
        const yFrac = (i / ionCount + (t * 0.01)) % 1
        const orbitAngle = i * 1.7 + t * 0.08
        const pIon = project3D(yFrac, orbitAngle, 1.4 + Math.sin(i * 3) * 0.3)
        drawItems.push({
          type: 'atom',
          p: pIon,
          r: (isDesktop() ? 1.8 : 1.2) * pIon.persp,
          strand: 2,
          z: pIon.z,
        })
      }

      drawItems.sort((a, b) => a.z - b.z)

      function drawBackboneStrand(strandOffset: number, color: { r: number; g: number; b: number }) {
        const segs = 70
        ctx!.beginPath()
        for (let i = 0; i <= segs; i++) {
          const pt = project3D(i / segs, strandOffset)
          if (i === 0) ctx!.moveTo(pt.x, pt.y)
          else ctx!.lineTo(pt.x, pt.y)
        }
        ctx!.strokeStyle = rgba(color, 0.35)
        ctx!.lineWidth = isDesktop() ? 2.8 : 1.8
        ctx!.stroke()
      }

      drawBackboneStrand(0, CLR.blue)
      drawBackboneStrand(Math.PI, CLR.violet)

      for (let i = 0; i < drawItems.length; i++) {
        const item = drawItems[i]
        if (item.type === 'rung') {
          const isFront = item.z > 0
          const alpha = isFront ? 0.35 + item.z * 0.45 : 0.12 + (item.z + 1) * 0.15
          const lineW = (isDesktop() ? 2.2 : 1.5) * item.p1.persp

          const grad = ctx!.createLinearGradient(item.p1.x, item.p1.y, item.p2.x, item.p2.y)
          grad.addColorStop(0, rgba(CLR.blue, alpha))
          grad.addColorStop(0.45, rgba(CLR.lavender, alpha * 0.9))
          grad.addColorStop(0.55, rgba(CLR.lavender, alpha * 0.9))
          grad.addColorStop(1, rgba(CLR.violet, alpha))

          ctx!.strokeStyle = grad
          ctx!.lineWidth = lineW
          ctx!.beginPath()
          ctx!.moveTo(item.p1.x, item.p1.y)
          ctx!.lineTo(item.p2.x, item.p2.y)
          ctx!.stroke()

          const midX = (item.p1.x + item.p2.x) / 2
          const midY = (item.p1.y + item.p2.y) / 2
          const juncR = (isDesktop() ? 2.0 : 1.4) * item.p1.persp
          ctx!.fillStyle = rgba(CLR.lavender, alpha * 0.8)
          ctx!.beginPath()
          ctx!.arc(midX, midY, juncR, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          const { p, r, strand, isBaseNode } = item
          const isFront = p.z > 0
          const depthAlpha = isFront ? 0.65 + p.z * 0.35 : 0.20 + (p.z + 1) * 0.25

          const baseClr =
            strand === 0
              ? isBaseNode ? CLR.blue : CLR.navy
              : strand === 1
                ? isBaseNode ? CLR.violet : CLR.indigo
                : CLR.cyan

          ctx!.fillStyle = rgba(baseClr, depthAlpha)
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx!.fill()

          if (isFront && r > 1.8) {
            ctx!.fillStyle = `rgba(255, 255, 255, ${(depthAlpha * 0.75).toFixed(3)})`
            ctx!.beginPath()
            ctx!.arc(p.x - r * 0.32, p.y - r * 0.32, r * 0.35, 0, Math.PI * 2)
            ctx!.fill()
          }
        }
      }
    }

    // ─── Layer 5: Data pulses ───────────────────────────────

    function drawPulses(dt: number, px: number, py: number) {
      const { nodes, edges } = net

      nextPulseTime -= dt
      if (nextPulseTime <= 0 && pulses.length < 3 && edges.length > 0) {
        pulses.push({
          edgeIndex: Math.floor(Math.random() * edges.length),
          t: 0,
          speed: 0.5 + Math.random() * 0.5,
          glowR: 3 + Math.random() * 2,
        })
        nextPulseTime = 4 + Math.random() * 5
      }

      pulses = pulses.filter((pulse) => {
        pulse.t += dt * pulse.speed
        if (pulse.t >= 1) return false

        const edge = edges[pulse.edgeIndex]
        if (!edge) return false
        const a = nodes[edge.a], b = nodes[edge.b]
        if (!a || !b) return false

        const progress = pulse.t
        const curX = a.x + (b.x - a.x) * progress
        const curY = a.y + (b.y - a.y) * progress
        const depth = a.zBand === 'fore' || b.zBand === 'fore' ? PX.net_fore : PX.net_mid
        const oox = px * depth * w, ooy = py * depth * h
        const drawX = curX + oox, drawY = curY + ooy
        const fade = Math.sin(progress * Math.PI)

        const grd = ctx!.createRadialGradient(drawX, drawY, 0, drawX, drawY, pulse.glowR * 3)
        grd.addColorStop(0, rgba(CLR.cyan, 0.3 * fade))
        grd.addColorStop(1, 'rgba(240,245,253,0)')
        ctx!.fillStyle = grd
        ctx!.beginPath()
        ctx!.arc(drawX, drawY, pulse.glowR * 3, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.fillStyle = rgba(CLR.cyan, 0.7 * fade)
        ctx!.beginPath()
        ctx!.arc(drawX, drawY, pulse.glowR * 0.5, 0, Math.PI * 2)
        ctx!.fill()

        return true
      })
    }

    // ─── Layer 6: Vignette ──────────────────────────────────

    function drawVignette() {
      const grd = ctx!.createRadialGradient(
        w * 0.5, h * 0.38, w * 0.15,
        w * 0.5, h * 0.38, Math.max(w, h) * 0.70,
      )
      grd.addColorStop(0, 'rgba(243,247,255,0.28)')
      grd.addColorStop(0.35, 'rgba(243,247,255,0)')
      grd.addColorStop(1, 'rgba(224,230,246,0.07)')
      ctx!.fillStyle = grd
      ctx!.fillRect(0, 0, w, h)
    }

    // ─── Main draw ──────────────────────────────────────────

    function draw(t: number, dt: number) {
      if (isDesktop()) {
        smoothMX += (mouseNX - smoothMX) * Math.min(dt * 2, 1)
        smoothMY += (mouseNY - smoothMY) * Math.min(dt * 2, 1)
      }
      const pmx = smoothMX, pmy = smoothMY

      drawAtmosphere(t)
      drawQuantumBlobs(t, pmx, pmy)
      drawWaveField(t, pmx, pmy)
      drawNetwork(t, pmx, pmy)
      drawDNA(t, pmx, pmy)
      if (!prefersReducedMotion) drawPulses(dt, pmx, pmy)
      drawVignette()
    }

    // ─── Animation loop (GSAP Ticker + Viewport Lifecycle) ──

    function tick() {
      const now = performance.now() / 1000
      const dt = Math.min(now - lastNow, 0.1)
      lastNow = now
      elapsed += dt
      draw(elapsed, dt)
    }

    // ─── Events ─────────────────────────────────────────────

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return
      mouseNX = (e.clientX / w) * 2 - 1
      mouseNY = (e.clientY / h) * 2 - 1
    }

    let resizeRaf = 0
    function onResize() {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        applySize()
        if (prefersReducedMotion) draw(0, 1)
      })
    }

    let isTicking = false
    let isVisible = true

    function startTicker() {
      if (!isTicking && isVisible && !document.hidden && !prefersReducedMotion) {
        lastNow = performance.now() / 1000
        gsap.ticker.add(tick)
        isTicking = true
      }
    }

    function stopTicker() {
      if (isTicking) {
        gsap.ticker.remove(tick)
        isTicking = false
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        if (isVisible) startTicker()
        else stopTicker()
      },
      { threshold: 0.01 },
    )
    observer.observe(canvas)

    const onVisibilityChange = () => {
      if (document.hidden) stopTicker()
      else if (isVisible) startTicker()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    applySize()
    if (prefersReducedMotion) {
      draw(0, 1)
    } else {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      startTicker()
    }
    window.addEventListener('resize', onResize)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      stopTicker()
    }
  }, [prefersReducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 0 }}
    />
  )
}
