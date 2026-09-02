import { forwardRef, useEffect, useLayoutEffect, useRef, type CSSProperties, type Ref } from 'react'
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
  type FieldNode,
} from './computationalFieldGeometry'

export type ComputationalFieldProps = {
  className?: string
  style?: CSSProperties
  /** Driven by Hero's CTA hover — the quantum cluster reacts. */
  hoverActive?: boolean
}

/** Orthogonal L-shaped connector for classical zones */
function orthogonalPath(a: FieldNode, b: FieldNode): string {
  const midX = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`
}

/** Straight path for convergence/diagonal connections */
function straightPath(a: FieldNode, b: FieldNode): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
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

/**
 * Signature visual for HQD-Net: CLASSICAL → QUANTUM → CLASSICAL.
 *
 * Layers (bottom to top):
 *  1. Editorial construction grid — very faint, structural scaffolding
 *  2. Probability radiants — dashed, from quantum center, low opacity
 *  3. Classical-in orthogonal paths + nodes (Powder Blue tint, low opacity)
 *  4. Convergence paths (Royal Blue, low opacity — the approach)
 *  5. Quantum cluster paths (Royal Blue, with tight glow filter)
 *  6. Quantum cluster nodes (Royal Blue circles)
 *  7. Divergence paths (Royal Blue, low opacity — the exit)
 *  8. Classical-out paths + nodes (Powder Blue tint, mirrored)
 *  9. Signal pulse (Royal Blue dot, the current computation state)
 *
 * All paths are drawn with strokeDasharray for the draw-in reveal animation.
 * The quantum glow uses stdDeviation=2.5 (precise, not fuzzy).
 */
export const ComputationalField = forwardRef<SVGSVGElement, ComputationalFieldProps>(
  function ComputationalField({ className, style, hoverActive = false }, ref) {
    const svgRef = useRef<SVGSVGElement>(null)
    const quantumGroupRef = useRef<SVGGElement>(null)
    const quantumLinesRef = useRef<SVGGElement>(null)
    const pulseRef = useRef<SVGCircleElement>(null)
    const pulseGlowRef = useRef<SVGCircleElement>(null)
    const prefersReducedMotion = usePrefersReducedMotion()

    /* ---- Idle animation loop ---- */
    useLayoutEffect(() => {
      if (prefersReducedMotion || !svgRef.current) return

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

        // Draw-in cascade: classical-in → convergence → quantum → divergence → classical-out
        // Called by parent HeroArchitectureFlow as part of the hero timeline.
        // The 'field-draw' class signals the parent to animate these.

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
            // Brief flash in quantum zone
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

      return () => ctx.revert()
    }, [prefersReducedMotion])

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
          {/* Precise quantum glow — tight, not fuzzy */}
          <filter id="quantum-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Signal pulse glow */}
          <filter id="pulse-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Very faint editorial construction grid gradient */}
          <linearGradient id="grid-fade-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={classicalFg} stopOpacity="0" />
            <stop offset="15%" stopColor={classicalFg} stopOpacity="1" />
            <stop offset="85%" stopColor={classicalFg} stopOpacity="1" />
            <stop offset="100%" stopColor={classicalFg} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layer 1: Editorial construction grid — architectural scaffolding */}
        <g opacity="0.028" stroke={classicalFg} strokeWidth="0.75" fill="none">
          {/* Horizontal rules */}
          {[160, 320, 480, 640].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2={VIEWBOX.width} y2={y} />
          ))}
          {/* Vertical rules */}
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

        {/* Layer 3: Classical-in paths — orthogonal, recede visually */}
        <g
          className="field-zone-classical-in"
          stroke={classicalFg}
          strokeOpacity="0.22"
          fill="none"
        >
          {classicalInPaths.map(([a, b], i) => (
            <path
              key={i}
              className="field-path"
              d={orthogonalPath(a, b)}
              strokeWidth={0.875}
            />
          ))}
        </g>
        {/* Classical-in nodes — small squares */}
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

        {/* Layer 4: Convergence paths — classical → quantum approach (Caramel) */}
        <g stroke={convergenceFg} strokeOpacity="0.35" fill="none">
          {convergenceInPaths.map(([a, b], i) => (
            <path
              key={i}
              className="field-path"
              d={straightPath(a, b)}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Layer 5: Quantum cluster paths with tight glow */}
        <g ref={quantumGroupRef} className="field-zone-quantum">
          <g
            ref={quantumLinesRef}
            stroke="var(--color-accent)"
            strokeOpacity="0.55"
            fill="none"
            filter="url(#quantum-glow)"
          >
            {quantumPaths.map(([a, b], i) => (
              <line
                key={i}
                className="quantum-path"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={1.25}
              />
            ))}
          </g>

          {/* Layer 6: Quantum nodes — circles with glow */}
          <g filter="url(#quantum-glow)">
            {quantumNodes.map((n, i) => (
              <circle
                key={i}
                cx={n.x}
                cy={n.y}
                r={i === 4 ? 7 : 4.5} // center node is larger
                fill="var(--color-accent)"
                fillOpacity={i === 4 ? 0.9 : 0.7}
              />
            ))}
          </g>
        </g>

        {/* Layer 7: Divergence paths — quantum → classical-out (Caramel) */}
        <g stroke={convergenceFg} strokeOpacity="0.35" fill="none">
          {convergenceOutPaths.map(([a, b], i) => (
            <path
              key={i}
              className="field-path"
              d={straightPath(a, b)}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Layer 8: Classical-out paths + nodes */}
        <g
          className="field-zone-classical-out"
          stroke={classicalFg}
          strokeOpacity="0.22"
          fill="none"
        >
          {classicalOutPaths.map(([a, b], i) => (
            <path
              key={i}
              className="field-path"
              d={orthogonalPath(a, b)}
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

        {/* Layer 9: Signal pulse — the current computation state (Caramel) */}
        {/* Glow halo */}
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
        {/* Core dot */}
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
