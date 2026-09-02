import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Props = {
  isActive: boolean
  prefersReducedMotion: boolean
}

export function QuantumCircuitVisual({ isActive, prefersReducedMotion }: Props) {
  const circuitRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!circuitRef.current || prefersReducedMotion) return

    const ctx = gsap.context(() => {
      if (isActive) {
        gsap.to('.q-wire', { strokeOpacity: 1, duration: 1, stagger: 0.1 })
        gsap.to('.q-gate', { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.2, ease: 'back.out(1.5)' })
        gsap.to('.q-pulse', {
          x: 400,
          opacity: 0,
          duration: 1.5,
          stagger: 0.2,
          repeat: -1,
          ease: 'linear',
          delay: 0.5
        })
      } else {
        gsap.to('.q-wire, .q-gate', { opacity: 0, strokeOpacity: 0.1, duration: 0.5 })
        gsap.killTweensOf('.q-pulse')
        gsap.set('.q-pulse', { x: 0, opacity: 0 })
      }
    }, circuitRef)

    return () => ctx.revert()
  }, [isActive, prefersReducedMotion])

  return (
    <div className="w-full flex justify-center mt-8 opacity-70">
      <svg
        ref={circuitRef}
        width="440"
        height="120"
        viewBox="0 0 440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wires */}
        <path className="q-wire" d="M40 20 H 400" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.1" />
        <path className="q-wire" d="M40 60 H 400" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.1" />
        <path className="q-wire" d="M40 100 H 400" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.1" />

        {/* Entanglement Line */}
        <path className="q-wire" d="M220 20 V 100" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.1" />

        {/* Pulses */}
        <circle className="q-pulse" cx="40" cy="20" r="2" fill="var(--color-accent)" opacity="0" />
        <circle className="q-pulse" cx="40" cy="60" r="2" fill="var(--color-accent)" opacity="0" />
        <circle className="q-pulse" cx="40" cy="100" r="2" fill="var(--color-accent)" opacity="0" />

        {/* Gates */}
        <g className="q-gate" opacity="0" transform="translate(100, 10)">
          <rect width="24" height="20" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" />
          <text x="12" y="14" fill="var(--color-accent)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>
        <g className="q-gate" opacity="0" transform="translate(100, 50)">
          <rect width="24" height="20" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" />
          <text x="12" y="14" fill="var(--color-accent)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>
        <g className="q-gate" opacity="0" transform="translate(100, 90)">
          <rect width="24" height="20" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" />
          <text x="12" y="14" fill="var(--color-accent)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>

        {/* Entanglement Nodes */}
        <circle className="q-gate" cx="220" cy="20" r="4" fill="var(--color-accent)" opacity="0" />
        <circle className="q-gate" cx="220" cy="60" r="4" fill="var(--color-accent)" opacity="0" />
        <circle className="q-gate" cx="220" cy="100" r="4" fill="var(--color-accent)" opacity="0" />

        <g className="q-gate" opacity="0" transform="translate(300, 50)">
          <rect width="24" height="20" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" />
          <text x="12" y="14" fill="var(--color-accent)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>
      </svg>
    </div>
  )
}
