import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { WorkflowState } from '../types/analysis'
import { QuantumCircuitVisual } from './QuantumCircuitVisual'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'

type Props = {
  state: WorkflowState
}

const STAGES = [
  { id: 'data', label: 'DATA', stateKey: 'preprocessing' }, // Actually starts before preprocessing, but for visual we highlight
  { id: 'preprocess', label: 'PREPROCESS', stateKey: 'preprocessing' },
  { id: 'encode', label: 'ENCODE', stateKey: 'encoding' },
  { id: 'quantum', label: 'QUANTUM', stateKey: 'quantum', isQuantum: true },
  { id: 'postprocess', label: 'POST-PROCESS', stateKey: 'postprocessing' },
  { id: 'explain', label: 'EXPLAIN', stateKey: 'explainability' },
]

export function ComputationalPipeline({ state }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // Find the active stage index
      const activeIndex = STAGES.findIndex(s => s.stateKey === state)
      
      if (activeIndex >= 0) {
        // Highlight active node
        gsap.to(`.pipe-node-${activeIndex}`, {
          borderColor: 'var(--color-accent)',
          color: 'var(--color-accent)',
          scale: 1.05,
          duration: 0.3,
          ease: 'power2.out'
        })
        
        // Dim previous nodes slightly
        if (activeIndex > 0) {
          gsap.to(`.pipe-node-${activeIndex - 1}`, {
            borderColor: 'var(--color-line-strong)',
            color: 'var(--color-secondary)',
            scale: 1,
            duration: 0.3
          })
        }
        
        // Animate the signal moving to the current active node
        // Assuming we have a signal dot that moves along the connections
        if (activeIndex > 0) {
           const prevNode = document.querySelector(`.pipe-node-${activeIndex - 1}`)
           const currNode = document.querySelector(`.pipe-node-${activeIndex}`)
           
           if (prevNode && currNode) {
             const prevRect = prevNode.getBoundingClientRect()
             const currRect = currNode.getBoundingClientRect()
             const containerRect = containerRef.current!.getBoundingClientRect()
             
             // Calculate relative positions
             const startX = prevRect.right - containerRect.left
             const endX = currRect.left - containerRect.left
             const startY = prevRect.top + prevRect.height / 2 - containerRect.top
             const endY = currRect.top + currRect.height / 2 - containerRect.top
             
             // If horizontal layout
             if (Math.abs(startY - endY) < 20) {
               gsap.fromTo('.pipe-signal', 
                 { x: startX, y: startY, opacity: 1, scale: 1 },
                 { x: endX, y: endY, duration: 0.6, ease: 'power2.inOut', onComplete: () => {
                     gsap.to('.pipe-signal', { opacity: 0, scale: 0, duration: 0.2 })
                 }}
               )
             } else {
               // Vertical layout (mobile)
               const mStartX = prevRect.left + prevRect.width / 2 - containerRect.left
               const mEndX = currRect.left + currRect.width / 2 - containerRect.left
               const mStartY = prevRect.bottom - containerRect.top
               const mEndY = currRect.top - containerRect.top
               
               gsap.fromTo('.pipe-signal', 
                 { x: mStartX, y: mStartY, opacity: 1, scale: 1 },
                 { x: mEndX, y: mEndY, duration: 0.6, ease: 'power2.inOut', onComplete: () => {
                     gsap.to('.pipe-signal', { opacity: 0, scale: 0, duration: 0.2 })
                 }}
               )
             }
           }
        }
      }

    }, containerRef)

    return () => ctx.revert()
  }, [state, prefersReducedMotion])

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Signal Dot */}
      <div className="pipe-signal absolute w-2 h-2 rounded-full bg-accent opacity-0 pointer-events-none -ml-1 -mt-1 z-10 shadow-[0_0_4px_var(--color-accent)]" />
      
      {/* Pipeline Nodes */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 relative z-0">
        {/* Connection line background (desktop) */}
        <div className="hidden md:block absolute top-1/2 left-8 right-8 h-px bg-line -translate-y-1/2 -z-10" />
        
        {/* Connection line background (mobile) */}
        <div className="block md:hidden absolute left-1/2 top-8 bottom-8 w-px bg-line -translate-x-1/2 -z-10" />

        {STAGES.map((stage, i) => {
          const isActive = stage.stateKey === state

          return (
            <div 
              key={stage.id} 
              className={`pipe-node-${i} relative flex items-center justify-center bg-canvas border rounded-full px-4 py-2 transition-colors duration-300 ${
                isActive
                  ? 'border-accent text-primary bg-accent/10'
                  : 'border-line text-muted'
              }`}
            >
               <span className="font-mono text-[10px] tracking-widest uppercase">{stage.label}</span>
            </div>
          )
        })}
      </div>

      <QuantumCircuitVisual isActive={state === 'quantum'} prefersReducedMotion={prefersReducedMotion} />
    </div>
  )
}
