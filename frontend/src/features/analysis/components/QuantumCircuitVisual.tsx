import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

type Props = {
  isActive: boolean
  prefersReducedMotion: boolean
}

export function QuantumCircuitVisual({ isActive, prefersReducedMotion }: Props) {
  const circuitRef = useRef<SVGSVGElement>(null)
  const [hoveredQubit, setHoveredQubit] = useState<number | null>(null)

  useEffect(() => {
    if (!circuitRef.current || prefersReducedMotion) return

    const ctx = gsap.context(() => {
      if (isActive) {
        gsap.to('.q-wire', { strokeOpacity: 0.8, duration: 0.8, stagger: 0.08 })
        gsap.to('.q-gate', { opacity: 1, scale: 1, duration: 0.4, stagger: 0.08, delay: 0.15, ease: 'power2.out' })
        gsap.to('.q-pulse', {
          x: 400,
          opacity: 0,
          duration: 1.4,
          stagger: 0.2,
          repeat: -1,
          ease: 'power1.inOut',
          delay: 0.3
        })
      } else {
        gsap.to('.q-wire, .q-gate', { opacity: 0.3, strokeOpacity: 0.2, duration: 0.4 })
        gsap.killTweensOf('.q-pulse')
        gsap.set('.q-pulse', { x: 0, opacity: 0 })
      }
    }, circuitRef)

    return () => ctx.revert()
  }, [isActive, prefersReducedMotion])

  return (
    <div className="w-full flex flex-col items-center justify-center mt-8 border border-line-subtle bg-surface/40 p-4 rounded-sm">
      <div className="flex items-center justify-between w-full max-w-[440px] mb-2 px-2">
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
          {isActive ? 'QUANTUM CIRCUIT EXECUTION (4-QUBIT ANSATZ)' : 'QUANTUM CIRCUIT TOPOLOGY'}
        </span>
        {hoveredQubit !== null ? (
          <span className="font-mono text-[10px] text-accent tracking-widest uppercase">
            Q{hoveredQubit}: |0⟩ → Ry(θ_{hoveredQubit})
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
            HOVER TO INSPECT
          </span>
        )}
      </div>

      <svg
        ref={circuitRef}
        width="440"
        height="120"
        viewBox="0 0 440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Qubit Labels */}
        <text x="16" y="24" fill="var(--color-fg-muted)" fontSize="10" fontFamily="monospace">q₀</text>
        <text x="16" y="64" fill="var(--color-fg-muted)" fontSize="10" fontFamily="monospace">q₁</text>
        <text x="16" y="104" fill="var(--color-fg-muted)" fontSize="10" fontFamily="monospace">q₂</text>

        {/* Wires with hover regions */}
        <g onMouseEnter={() => setHoveredQubit(0)} onMouseLeave={() => setHoveredQubit(null)} className="cursor-pointer">
          <path className="q-wire" d="M40 20 H 400" stroke={hoveredQubit === 0 ? "var(--color-accent)" : "var(--color-line-strong)"} strokeWidth={hoveredQubit === 0 ? "2" : "1"} strokeOpacity="0.6" />
        </g>
        <g onMouseEnter={() => setHoveredQubit(1)} onMouseLeave={() => setHoveredQubit(null)} className="cursor-pointer">
          <path className="q-wire" d="M40 60 H 400" stroke={hoveredQubit === 1 ? "var(--color-accent)" : "var(--color-line-strong)"} strokeWidth={hoveredQubit === 1 ? "2" : "1"} strokeOpacity="0.6" />
        </g>
        <g onMouseEnter={() => setHoveredQubit(2)} onMouseLeave={() => setHoveredQubit(null)} className="cursor-pointer">
          <path className="q-wire" d="M40 100 H 400" stroke={hoveredQubit === 2 ? "var(--color-accent)" : "var(--color-line-strong)"} strokeWidth={hoveredQubit === 2 ? "2" : "1"} strokeOpacity="0.6" />
        </g>

        {/* Entanglement Line */}
        <path className="q-wire" d="M220 20 V 100" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />

        {/* Pulses */}
        <circle className="q-pulse" cx="40" cy="20" r="2.5" fill="var(--color-accent)" opacity="0" />
        <circle className="q-pulse" cx="40" cy="60" r="2.5" fill="var(--color-accent)" opacity="0" />
        <circle className="q-pulse" cx="40" cy="100" r="2.5" fill="var(--color-accent)" opacity="0" />

        {/* Parameterized Ry Rotation Gates */}
        <g className="q-gate group cursor-help" opacity="0.9" transform="translate(100, 10)">
          <rect width="28" height="20" rx="2" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" strokeWidth="1" />
          <text x="14" y="14" fill="var(--color-fg-primary)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>
        <g className="q-gate group cursor-help" opacity="0.9" transform="translate(100, 50)">
          <rect width="28" height="20" rx="2" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" strokeWidth="1" />
          <text x="14" y="14" fill="var(--color-fg-primary)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>
        <g className="q-gate group cursor-help" opacity="0.9" transform="translate(100, 90)">
          <rect width="28" height="20" rx="2" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" strokeWidth="1" />
          <text x="14" y="14" fill="var(--color-fg-primary)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ry</text>
        </g>

        {/* Entanglement Control & Target Nodes */}
        <circle className="q-gate" cx="220" cy="20" r="4" fill="var(--color-accent)" opacity="0.9" />
        <circle className="q-gate" cx="220" cy="60" r="4" fill="var(--color-accent)" opacity="0.9" />
        <circle className="q-gate" cx="220" cy="100" r="4" fill="var(--color-accent)" opacity="0.9" />

        {/* Layer 2 Variational Gates */}
        <g className="q-gate group cursor-help" opacity="0.9" transform="translate(300, 50)">
          <rect width="28" height="20" rx="2" fill="var(--color-bg-surface-raised)" stroke="var(--color-accent)" strokeWidth="1" />
          <text x="14" y="14" fill="var(--color-fg-primary)" fontSize="10" fontFamily="monospace" textAnchor="middle">Rz</text>
        </g>
      </svg>
    </div>
  )
}
