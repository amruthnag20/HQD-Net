import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { router } from '@/app/router'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'
import {
  generateTopology,
  getDensityTier,
  INTENSITY_PRESETS,
  type DensityTier,
  type IntensityTier,
  type NetworkTopology,
} from '@/lib/motion/computationalNetwork'

export type LivingComputationalBackgroundProps = {
  /**
   * Fixes the environment at one intensity regardless of route. Omit to let
   * the background auto-configure itself from the current route — this is
   * how the single app-wide instance in App.tsx is meant to be used.
   */
  intensity?: IntensityTier
}

/** Route → environment intensity. Checked in order, first match wins. */
const ROUTE_INTENSITY: Array<[test: (pathname: string) => boolean, tier: IntensityTier]> = [
  [(p) => p === '/', 'high'],
  [(p) => p.startsWith('/auth'), 'low'],
  [(p) => p === '/app' || p === '/app/home', 'medium-high'],
  [(p) => p.startsWith('/app/history'), 'medium'],
  [(p) => p.startsWith('/app/settings'), 'low'],
]

function intensityForPath(pathname: string): IntensityTier {
  for (const [test, tier] of ROUTE_INTENSITY) {
    if (test(pathname)) return tier
  }
  return 'medium'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.trim().replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  const value = parseInt(full, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

/** Canvas fillStyle/strokeStyle need real rgba() strings — can't reference a
 *  CSS var() there — so we read the authored token values once at mount via
 *  getComputedStyle (they're registered as real custom properties by
 *  Tailwind's @theme block) and fall back to the known token hex if unset. */
function readThemeColor(styles: CSSStyleDeclaration, varName: string, fallbackHex: string) {
  const raw = styles.getPropertyValue(varName).trim()
  return hexToRgb(raw || fallbackHex)
}

/**
 * A persistent, ambient computational network that lives behind the entire
 * application. Mounted once at the App root (outside the router) so it
 * never unmounts on navigation — only its intensity preset changes as the
 * route changes, giving a continuous "same environment" feel rather than a
 * per-page background restarting.
 *
 * React owns lifecycle/config only. The animation loop is plain per-frame
 * math driven by gsap.ticker (the same heartbeat Lenis hooks into elsewhere
 * in this app) — no React state updates per frame, no per-node GSAP tweens.
 */
export function LivingComputationalBackground({ intensity }: LivingComputationalBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvasCurrent = canvasRef.current
    const ctxCurrent = canvasCurrent?.getContext('2d')
    if (!canvasCurrent || !ctxCurrent) return

    // Rebind as fresh, definitely-non-null consts: TS's flow narrowing above
    // does not carry into the nested closures below (they're captured by
    // reference, not by narrowed type), so the narrowed reference needs a
    // new binding to keep its non-null type inside them.
    const canvas = canvasCurrent
    const ctx = ctxCurrent

    const styles = getComputedStyle(document.documentElement)
    const royal = readThemeColor(styles, '--color-fg-primary', '#0E2F76')
    const powder = readThemeColor(styles, '--color-baby', '#A9C0E0')

    let width = window.innerWidth
    let height = window.innerHeight
    let densityTier: DensityTier = getDensityTier(width)
    let topology: NetworkTopology = generateTopology(densityTier)

    let preset = INTENSITY_PRESETS[intensity ?? intensityForPath(router.state.location.pathname)]

    let pointerX = 0
    let pointerY = 0
    let parallaxX = 0
    let parallaxY = 0
    let elapsed = 0
    let lastTime = performance.now() / 1000

    type Signal = { linkIndex: number; t: number; duration: number; reverse: boolean }
    let signals: Signal[] = []
    let signalTimer: gsap.core.Tween | null = null
    let topologyTimer: gsap.core.Tween | null = null

    function includedLinks() {
      return topology.links.filter((link) => link.priority <= preset.inclusion && !link.dormant)
    }

    function scheduleSignal() {
      const delay = preset.signalIntervalMin + Math.random() * (preset.signalIntervalMax - preset.signalIntervalMin)
      signalTimer = gsap.delayedCall(delay, spawnSignal)
    }

    function spawnSignal() {
      const candidates = includedLinks()
      if (candidates.length === 0) {
        scheduleSignal()
        return
      }
      const link = candidates[Math.floor(Math.random() * candidates.length)]
      const linkIndex = topology.links.indexOf(link)
      const reverse = Math.random() < 0.5
      signals.push({ linkIndex, t: 0, duration: 0.7 + Math.random() * 0.6, reverse })
      const sourceId = reverse ? link.b : link.a
      topology.nodes[sourceId].activity = 1
      scheduleSignal()
    }

    function scheduleTopologyShift() {
      const delay = 18 + Math.random() * 22
      topologyTimer = gsap.delayedCall(delay, () => {
        const candidates = topology.links.filter((link) => link.priority <= preset.inclusion)
        if (candidates.length > 0) {
          const link = candidates[Math.floor(Math.random() * candidates.length)]
          link.dormant = !link.dormant
        }
        scheduleTopologyShift()
      })
    }

    function draw(dt: number) {
      ctx.clearRect(0, 0, width, height)
      const driftScale = preset.driftScale
      const parallaxOffsetX = parallaxX * 0.006
      const parallaxOffsetY = parallaxY * 0.006

      for (const link of topology.links) {
        const included = link.priority <= preset.inclusion && !link.dormant
        link.targetOpacity = included ? preset.baseLinkOpacity * (0.6 + link.weight * 0.8) : 0
        link.opacity += (link.targetOpacity - link.opacity) * Math.min(dt * 1.2, 1)
        if (link.opacity <= 0.002) continue

        const a = topology.nodes[link.a]
        const b = topology.nodes[link.b]
        ctx.strokeStyle = `rgba(${royal.r}, ${royal.g}, ${royal.b}, ${link.opacity.toFixed(3)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo((a.x + parallaxOffsetX) * width, (a.y + parallaxOffsetY) * height)
        ctx.lineTo((b.x + parallaxOffsetX) * width, (b.y + parallaxOffsetY) * height)
        ctx.stroke()
      }

      for (const node of topology.nodes) {
        node.activity = Math.max(0, node.activity - dt * 1.2)
        const included = node.priority <= preset.inclusion
        node.targetOpacity = (included ? preset.baseNodeOpacity * (node.isSecondary ? 0.8 : 1) : 0) + node.activity * 0.45
        node.opacity += (node.targetOpacity - node.opacity) * Math.min(dt * 1.5, 1)

        node.x = node.anchorX + Math.sin(elapsed * node.driftFreqX + node.driftPhaseX) * node.driftAmpX * driftScale
        node.y = node.anchorY + Math.sin(elapsed * node.driftFreqY + node.driftPhaseY) * node.driftAmpY * driftScale

        if (node.opacity <= 0.002) continue

        const color = node.isSecondary ? powder : royal
        ctx.beginPath()
        ctx.arc(
          (node.x + parallaxOffsetX) * width,
          (node.y + parallaxOffsetY) * height,
          node.radius,
          0,
          Math.PI * 2,
        )
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${node.opacity.toFixed(3)})`
        ctx.fill()
      }

      if (signals.length > 0) {
        signals = signals.filter((signal) => {
          signal.t += dt / signal.duration
          if (signal.t >= 1) {
            const link = topology.links[signal.linkIndex]
            const destId = signal.reverse ? link.a : link.b
            topology.nodes[destId].activity = 1
            return false
          }
          return true
        })

        for (const signal of signals) {
          const link = topology.links[signal.linkIndex]
          const from = topology.nodes[signal.reverse ? link.b : link.a]
          const to = topology.nodes[signal.reverse ? link.a : link.b]
          const t = Math.min(signal.t, 1)
          const ease = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2
          const fade = Math.sin(t * Math.PI)
          ctx.beginPath()
          ctx.arc(
            (from.x + (to.x - from.x) * ease + parallaxOffsetX) * width,
            (from.y + (to.y - from.y) * ease + parallaxOffsetY) * height,
            2.2,
            0,
            Math.PI * 2,
          )
          ctx.fillStyle = `rgba(${royal.r}, ${royal.g}, ${royal.b}, ${(0.85 * fade).toFixed(3)})`
          ctx.fill()
        }
      }
    }

    function tick() {
      const now = performance.now() / 1000
      const dt = Math.min(now - lastTime, 0.1)
      lastTime = now
      elapsed += dt
      parallaxX += (pointerX - parallaxX) * Math.min(dt * 1.5, 1)
      parallaxY += (pointerY - parallaxY) * Math.min(dt * 1.5, 1)
      draw(dt)
    }

    function onPointerMove(event: PointerEvent) {
      pointerX = (event.clientX / width) * 2 - 1
      pointerY = (event.clientY / height) * 2 - 1
    }

    function applySize() {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const nextTier = getDensityTier(width)
      if (nextTier !== densityTier) {
        densityTier = nextTier
        topology = generateTopology(densityTier)
      }
      // dt=1 (not 0): opacity is approached via a dt-scaled lerp from a
      // starting value of 0, so a literal dt=0 "single frame" would never
      // actually reach its target. dt=1 saturates the (dt*k, 1)-clamped
      // lerp factor to 1, snapping straight to the resting values.
      if (prefersReducedMotion) draw(1)
    }

    let resizeRaf = 0
    function onResize() {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(applySize)
    }

    applySize()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    let unsubscribeRouter = () => {}
    if (!intensity) {
      unsubscribeRouter = router.subscribe((state) => {
        preset = INTENSITY_PRESETS[intensityForPath(state.location.pathname)]
      })
    }

    if (prefersReducedMotion) {
      // One static, coherent frame — no drift, no signals, no topology shifts.
      // dt=1 snaps opacity straight to its resting value (see applySize).
      draw(1)
    } else {
      gsap.ticker.add(tick)
      scheduleSignal()
      scheduleTopologyShift()
    }

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(resizeRaf)
      gsap.ticker.remove(tick)
      signalTimer?.kill()
      topologyTimer?.kill()
      unsubscribeRouter()
    }
  }, [intensity, prefersReducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-background pointer-events-none"
    />
  )
}
