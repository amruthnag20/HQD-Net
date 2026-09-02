import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type Ref } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils/cn'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'
import {
  VIEWBOX,
  classicalInNodes,
  classicalInPaths,
  classicalOutNodes,
  classicalOutPaths,
  convergenceInPaths,
  convergenceOutPaths,
  quantumNodes,
  quantumPaths,
  probabilityRadiants,
  signalWaypoints,
  threadMeta,
  threadPath,
  type FieldLine,
  type ThreadMeta,
} from './computationalFieldGeometry'

export type ComputationalFieldProps = {
  className?: string
  style?: CSSProperties
  /** Driven by Hero's CTA hover — the quantum cluster reacts. */
  hoverActive?: boolean
}

type ThreadEntry = {
  id: number
  a: { x: number; y: number }
  b: { x: number; y: number }
  meta: ThreadMeta
}

function setRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(node)
      else (ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

/** Builds a registry of threads with alternating bow direction + stable jitter. */
function buildThreads(pairs: FieldLine[], baseBow: number, startIndex: number): ThreadEntry[] {
  return pairs.map(([a, b], i) => ({
    id: startIndex + i,
    a,
    b,
    meta: threadMeta(startIndex + i, i % 2 === 0 ? baseBow : -baseBow),
  }))
}

/**
 * Signature visual for HQD-Net: CLASSICAL → QUANTUM → CLASSICAL, rendered as
 * "entanglement threads" — soft bowed strands that breathe continuously,
 * rather than a rigid circuit schematic.
 *
 * Layers (bottom to top):
 *  1. Editorial construction grid — structural scaffolding
 *  2. Probability radiants — dashed, from quantum center
 *  3. Classical-in threads + nodes (Powder Blue tint) — field-depth-back
 *  4. Convergence threads (Royal Blue, the approach) — field-depth-mid
 *  5. Quantum cluster threads (Royal Blue, glow + shimmer) — field-depth-front
 *  6. Quantum cluster nodes (Royal Blue circles)
 *  7. Divergence threads (Royal Blue, the exit) — field-depth-mid
 *  8. Classical-out threads + nodes (Powder Blue tint, mirrored) — field-depth-back
 *  9. Signal pulse (Royal Blue dot, the current computation state)
 *
 * `.field-depth-back/-mid/-front` are the parallax hooks the parent
 * (HeroArchitectureFlow) drives with pointer + scroll.
 */
export const ComputationalField = forwardRef<SVGSVGElement, ComputationalFieldProps>(
  function ComputationalField({ className, style, hoverActive = false }, ref) {
    const svgRef = useRef<SVGSVGElement>(null)
    const quantumGroupRef = useRef<SVGGElement>(null)
    const quantumLinesRef = useRef<SVGGElement>(null)
    const pulseRef = useRef<SVGCircleElement>(null)
    const pulseGlowRef = useRef<SVGCircleElement>(null)
    const threadElsRef = useRef<Map<number, SVGPathElement>>(new Map())
    const prefersReducedMotion = usePrefersReducedMotion()

    /* ---- Thread registry — stable across renders ---- */
    const threads = useMemo(() => {
      const classicalIn = buildThreads(classicalInPaths, 14, 0)
      const classicalOut = buildThreads(classicalOutPaths, 14, 100)
      const convergenceIn = buildThreads(convergenceInPaths, 20, 200)
      const convergenceOut = buildThreads(convergenceOutPaths, 20, 300)
      const quantum = buildThreads(quantumPaths, 6, 400)
      const all = [...classicalIn, ...classicalOut, ...convergenceIn, ...convergenceOut, ...quantum]
      return { classicalIn, classicalOut, convergenceIn, convergenceOut, quantum, all }
    }, [])

    const registerThread = (id: number) => (el: SVGPathElement | null) => {
      if (el) threadElsRef.current.set(id, el)
      else threadElsRef.current.delete(id)
    }

    /* ---- Idle animation loop ---- */
    useLayoutEffect(() => {
      if (prefersReducedMotion || !svgRef.current) return

      let frameCount = 0
      let isVisible = true
      let isTicking = false

      // Continuous organic bow oscillation — throttled to alternate ticks (30fps)
      // to reduce SVG DOM string mutations by 50% with zero perceptual difference.
      const tick = () => {
        if (++frameCount % 2 !== 0) return
        const t = gsap.ticker.time
        for (const thread of threads.all) {
          const el = threadElsRef.current.get(thread.id)
          if (!el) continue
          const bow = thread.meta.bow + Math.sin(t * thread.meta.freq + thread.meta.phase) * thread.meta.amp
          el.setAttribute('d', threadPath(thread.a, thread.b, bow))
        }
      }

      function startTick() {
        if (!isTicking && isVisible && !document.hidden && !prefersReducedMotion) {
          gsap.ticker.add(tick)
          isTicking = true
        }
      }

      function stopTick() {
        if (isTicking) {
          gsap.ticker.remove(tick)
          isTicking = false
        }
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting
          if (isVisible) startTick()
          else stopTick()
        },
        { threshold: 0.01 },
      )

      if (svgRef.current) observer.observe(svgRef.current)

      const onVis = () => {
        if (document.hidden) stopTick()
        else if (isVisible) startTick()
      }
      document.addEventListener('visibilitychange', onVis)

      startTick()

      const ctx = gsap.context(() => {
        // Initialize all path lengths for stroke-dash animation
        const allPaths = gsap.utils.toArray<SVGPathElement | SVGLineElement>('.field-path')
        allPaths.forEach((path) => {
          const length = (path as SVGGeometryElement).getTotalLength?.() ?? 200
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
          })
        })

        // Slow zone drift — each zone group breathes at a different rate
        gsap.to('.field-zone-classical-in', {
          y: '+=6',
          duration: 14,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
        gsap.to('.field-zone-classical-out', {
          y: '-=4',
          duration: 16,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 2,
        })
        gsap.to('.field-zone-quantum', {
          y: '+=3',
          x: '+=2',
          duration: 20,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1,
        })

        // Signal pulse — travels the CLASSICAL → QUANTUM → CLASSICAL journey
        const pulseTl = gsap.timeline({ repeat: -1, repeatDelay: 4 })
        pulseTl.set(pulseRef.current, { opacity: 0 })
        pulseTl.to(pulseRef.current, { opacity: 1, duration: 0.3 })

        signalWaypoints.forEach(({ node, zone }) => {
          pulseTl.to(
            [pulseRef.current, pulseGlowRef.current],
            {
              attr: { cx: node.x, cy: node.y },
              duration: zone === 'quantum' ? 0.45 : 0.6,
              ease: 'power2.inOut',
            },
          )
          if (zone === 'quantum') {
            pulseTl.to(
              pulseRef.current,
              { attr: { r: 8 }, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' },
              '<',
            )
          }
        })

        pulseTl.to(pulseRef.current, { opacity: 0, duration: 0.4 })

        // Occasional quantum line flicker
        const qLines = gsap.utils.toArray<SVGLineElement | SVGPathElement>('.quantum-path')
        const flickerTl = gsap.timeline({ repeat: -1, repeatDelay: 8 })
        flickerTl.call(() => {
          const line = qLines[Math.floor(Math.random() * qLines.length)]
          if (line) {
            gsap.fromTo(
              line,
              { strokeOpacity: 0.6 },
              { strokeOpacity: 0.08, duration: 0.2, yoyo: true, repeat: 3, ease: 'power2.inOut' },
            )
          }
        })
      }, svgRef)

      return () => {
        observer.disconnect()
        document.removeEventListener('visibilitychange', onVis)
        stopTick()
        ctx.revert()
      }
    }, [prefersReducedMotion, threads])

    /* ---- CTA hover reaction ---- */
    useEffect(() => {
      if (prefersReducedMotion || !quantumGroupRef.current) return

      gsap.to(quantumGroupRef.current, {
        scale: hoverActive ? 1.04 : 1,
        transformOrigin: `${quantumNodes[4].x}px ${quantumNodes[4].y}px`,
        duration: 0.4,
        ease: 'power2.out',
      })
      if (quantumLinesRef.current) {
        gsap.to(quantumLinesRef.current, {
          attr: { 'stroke-opacity': hoverActive ? 0.9 : 0.55 },
          duration: 0.4,
          ease: 'power2.out',
        })
      }
    }, [hoverActive, prefersReducedMotion])

    const classicalFg = 'var(--color-baby)'
    const convergenceFg = 'var(--color-accent)'

    return (
      <svg
        ref={setRefs(ref, svgRef)}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className={cn('w-full h-auto', className)}
        style={style}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id="quantum-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="pulse-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="thread-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>

        {/* Layer 1: Editorial construction grid */}
        <g opacity="0.028" stroke={classicalFg} strokeWidth="0.75" fill="none">
          {[160, 320, 480, 640].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2={VIEWBOX.width} y2={y} />
          ))}
          {[350, 700, 1050].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2={VIEWBOX.height} />
          ))}
        </g>

        {/* Layer 2: Probability radiants from quantum center */}
        <g
          stroke="var(--color-baby)"
          strokeOpacity="0.18"
          strokeWidth="0.75"
          strokeDasharray="4 8"
          fill="none"
        >
          {probabilityRadiants.map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
        </g>

        {/* Layer 3: Classical-in threads — parallax depth: back */}
        <g className="field-depth-back">
          <g
            className="field-zone-classical-in"
            stroke={classicalFg}
            strokeOpacity="0.24"
            fill="none"
            filter="url(#thread-soft)"
          >
            {threads.classicalIn.map((thread) => (
              <path
                key={thread.id}
                ref={registerThread(thread.id)}
                className="field-path"
                d={threadPath(thread.a, thread.b, thread.meta.bow)}
                strokeWidth={0.875}
              />
            ))}
          </g>
          <g className="field-zone-classical-in">
            {classicalInNodes.map((n, i) => (
              <rect
                key={i}
                x={n.x - 4}
                y={n.y - 4}
                width={8}
                height={8}
                fill="var(--color-bg-canvas)"
                stroke={classicalFg}
                strokeOpacity="0.32"
                strokeWidth={0.875}
              />
            ))}
          </g>
        </g>

        {/* Layer 4: Convergence threads — parallax depth: mid */}
        <g className="field-depth-mid">
          <g stroke={convergenceFg} strokeOpacity="0.4" fill="none">
            {threads.convergenceIn.map((thread) => (
              <path
                key={thread.id}
                ref={registerThread(thread.id)}
                className="field-path"
                d={threadPath(thread.a, thread.b, thread.meta.bow)}
                strokeWidth={1}
              />
            ))}
          </g>
        </g>

        {/* Layer 5 & 6: Quantum cluster threads & nodes — parallax depth: front */}
        <g className="field-depth-front">
          <g ref={quantumGroupRef} className="field-zone-quantum">
            <g
              ref={quantumLinesRef}
              stroke="var(--color-accent)"
              strokeOpacity="0.55"
              fill="none"
              filter="url(#quantum-glow)"
            >
              {threads.quantum.map((thread) => (
                <path
                  key={thread.id}
                  ref={registerThread(thread.id)}
                  className="quantum-path thread-shimmer"
                  d={threadPath(thread.a, thread.b, thread.meta.bow)}
                  strokeWidth={1.25}
                />
              ))}
            </g>

            <g filter="url(#quantum-glow)">
              {quantumNodes.map((n, i) => (
                <circle
                  key={i}
                  cx={n.x}
                  cy={n.y}
                  r={i === 4 ? 7 : 4.5}
                  fill="var(--color-accent)"
                  fillOpacity={i === 4 ? 0.9 : 0.7}
                />
              ))}
            </g>
          </g>
        </g>

        {/* Layer 7: Divergence threads — parallax depth: mid */}
        <g className="field-depth-mid">
          <g stroke={convergenceFg} strokeOpacity="0.4" fill="none">
            {threads.convergenceOut.map((thread) => (
              <path
                key={thread.id}
                ref={registerThread(thread.id)}
                className="field-path"
                d={threadPath(thread.a, thread.b, thread.meta.bow)}
                strokeWidth={1}
              />
            ))}
          </g>
        </g>

        {/* Layer 8: Classical-out threads + nodes — parallax depth: back */}
        <g className="field-depth-back">
          <g
            className="field-zone-classical-out"
            stroke={classicalFg}
            strokeOpacity="0.24"
            fill="none"
            filter="url(#thread-soft)"
          >
            {threads.classicalOut.map((thread) => (
              <path
                key={thread.id}
                ref={registerThread(thread.id)}
                className="field-path"
                d={threadPath(thread.a, thread.b, thread.meta.bow)}
                strokeWidth={0.875}
              />
            ))}
          </g>
          <g className="field-zone-classical-out">
            {classicalOutNodes.map((n, i) => (
              <rect
                key={i}
                x={n.x - 4}
                y={n.y - 4}
                width={8}
                height={8}
                fill="var(--color-bg-canvas)"
                stroke={classicalFg}
                strokeOpacity="0.32"
                strokeWidth={0.875}
              />
            ))}
          </g>
        </g>

        {/* Layer 9: Signal pulse (Royal Blue) */}
        <circle
          ref={pulseGlowRef}
          cx={classicalInNodes[3].x}
          cy={classicalInNodes[3].y}
          r={12}
          fill="var(--color-accent)"
          fillOpacity="0.2"
          filter="url(#pulse-glow)"
          aria-hidden="true"
        />
        <circle
          ref={pulseRef}
          cx={classicalInNodes[3].x}
          cy={classicalInNodes[3].y}
          r={5}
          fill="var(--color-accent)"
          filter="url(#pulse-glow)"
        />
      </svg>
    )
  },
)
