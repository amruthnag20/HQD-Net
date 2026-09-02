import { forwardRef, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils/cn'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'
import {
  VIEWBOX,
  classicalInNodes,
  classicalInPaths,
  convergenceInPaths,
  quantumNodes,
  quantumPaths,
  probabilityRadiants,
} from '@/components/landing/computationalFieldGeometry'

export type AuthVisualFieldProps = {
  className?: string
  status?: 'idle' | 'detected' | 'verifying' | 'granted'
}

/**
 * A quieter, focused version of the computational field for the authentication gateway.
 * Represents the transition into the system.
 */
export const AuthVisualField = forwardRef<SVGSVGElement, AuthVisualFieldProps>(
  function AuthVisualField({ className, status = 'idle' }, ref) {
    const svgRef = useRef<SVGSVGElement>(null)
    const prefersReducedMotion = usePrefersReducedMotion()

    // Map internal DOM refs if the parent passed a ref
    const setRefs = (node: SVGSVGElement | null) => {
      ;(svgRef as any).current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as any).current = node
    }

    useLayoutEffect(() => {
      if (prefersReducedMotion || !svgRef.current) return

      const ctx = gsap.context(() => {
        // Base slow breathing for the auth field
        gsap.to('.auth-field-quantum', {
          y: '+=3',
          duration: 12,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
        
        gsap.to('.auth-field-classical', {
          y: '-=2',
          duration: 16,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })

        // Draw in lines smoothly on mount
        const paths = gsap.utils.toArray<SVGGeometryElement>('.auth-path')
        paths.forEach(p => {
          const l = p.getTotalLength?.() ?? 300
          gsap.set(p, { strokeDasharray: l, strokeDashoffset: l })
        })
        
        gsap.to(paths, {
          strokeDashoffset: 0,
          duration: 2,
          ease: 'power2.out',
          stagger: 0.05,
        })
      }, svgRef)

      return () => ctx.revert()
    }, [prefersReducedMotion])

    // State reactions
    useLayoutEffect(() => {
      if (prefersReducedMotion || !svgRef.current) return

      const ctx = gsap.context(() => {
        const qNodes = gsap.utils.toArray('.auth-q-node')
        const centerNode = qNodes[4]

        if (status === 'detected') {
          // Subtle pulse on outer nodes
          gsap.to(qNodes, {
            scale: 1.1,
            fillOpacity: 0.8,
            duration: 0.4,
            stagger: 0.05,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1
          })
        } else if (status === 'verifying') {
          // Rapid convergence sequence
          gsap.to('.auth-convergence', {
            strokeOpacity: 0.7,
            duration: 0.3,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          })
          gsap.to(centerNode as Element, {
            scale: 1.25,
            fillOpacity: 1,
            duration: 0.4,
            yoyo: true,
            repeat: -1,
            ease: 'power2.inOut'
          })
        } else if (status === 'granted') {
          // Solid lock-in
          gsap.killTweensOf('.auth-convergence')
          gsap.killTweensOf(centerNode as Element)
          gsap.to(centerNode as Element, {
            scale: 1.4,
            fillOpacity: 1,
            fill: 'var(--color-accent)',
            duration: 0.5,
            ease: 'back.out(2)'
          })
          gsap.to('.auth-q-path', {
            strokeOpacity: 0.9,
            duration: 0.5
          })
        } else {
          // Idle cleanup
          gsap.killTweensOf('.auth-convergence')
          gsap.killTweensOf(centerNode as Element)
          gsap.to('.auth-convergence', { strokeOpacity: 0.15, duration: 0.4 })
          gsap.to(centerNode as Element, { scale: 1, fillOpacity: 0.7, duration: 0.4 })
          gsap.to('.auth-q-path', { strokeOpacity: 0.35, duration: 0.4 })
        }
      }, svgRef)

      return () => ctx.revert()
    }, [status, prefersReducedMotion])

    // Reuse the exact coordinates from the landing page, but shifted left to fit the half-screen composition
    // ViewBox is trimmed to only show the classical-in and quantum nodes.
    const classicalFg = 'var(--color-baby)'
    const convergenceFg = 'var(--color-accent)'

    return (
      <svg
        ref={setRefs}
        viewBox={`0 0 1000 ${VIEWBOX.height}`}
        className={cn('w-full h-full max-w-none', className)}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id="auth-quantum-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="auth-field-classical">
          {/* Classical In Paths */}
          <g stroke={classicalFg} strokeOpacity="0.12" fill="none">
            {classicalInPaths.map(([a, b], i) => {
              const midX = (a.x + b.x) / 2
              return (
                <path
                  key={i}
                  className="auth-path"
                  d={`M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`}
                  strokeWidth={0.875}
                />
              )
            })}
          </g>
          {/* Classical Nodes */}
          <g>
            {classicalInNodes.map((n, i) => (
              <rect
                key={i}
                x={n.x - 4}
                y={n.y - 4}
                width={8}
                height={8}
                fill="var(--color-bg-canvas)"
                stroke={classicalFg}
                strokeOpacity="0.2"
                strokeWidth={0.875}
              />
            ))}
          </g>
        </g>

        <g className="auth-field-quantum">
          {/* Probability radiants */}
          <g
            stroke="var(--color-baby)"
            strokeOpacity="0.1"
            strokeWidth="0.75"
            strokeDasharray="4 8"
            fill="none"
          >
            {probabilityRadiants.map(([a, b], i) => (
              <line key={i} className="auth-path" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            ))}
          </g>

          {/* Convergence Bridges */}
          <g stroke={convergenceFg} fill="none">
            {convergenceInPaths.map(([a, b], i) => (
              <path
                key={i}
                className="auth-path auth-convergence"
                style={{ strokeOpacity: 0.15 }}
                d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                strokeWidth={1}
              />
            ))}
          </g>

          {/* Quantum Cluster */}
          <g filter="url(#auth-quantum-glow)">
            <g
              stroke="var(--color-accent)"
              fill="none"
            >
              {quantumPaths.map(([a, b], i) => (
                <line
                  key={i}
                  className="auth-path auth-q-path"
                  style={{ strokeOpacity: 0.35 }}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={1.25}
                />
              ))}
            </g>
            <g>
              {quantumNodes.map((n, i) => (
                <circle
                  key={i}
                  className="auth-q-node"
                  cx={n.x}
                  cy={n.y}
                  r={i === 4 ? 6 : 4}
                  fill="var(--color-accent)"
                  fillOpacity={i === 4 ? 0.9 : 0.6}
                  style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                />
              ))}
            </g>
          </g>
        </g>
      </svg>
    )
  },
)
