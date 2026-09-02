import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { landingCopy } from '@/content/landingCopy'

/**
 * Final CTA — ENTER HQD-NET.
 *
 * Dark canvas. The culmination of the page experience.
 * Large display headline. Restrained editorial button. No pill.
 * Subtle top rule in Caramel to close the paper section's visual energy.
 */
export function FinalCta() {
  const navigate = useNavigate()
  const { headline, subhead, cta, secondary } = landingCopy.finalCta
  const prefersReducedMotion = useReducedMotion()
  
  const [isNavigating, setIsNavigating] = useState(false)

  const handleNavigateAuth = () => {
    if (isNavigating) return
    setIsNavigating(true)
    if (prefersReducedMotion) {
      navigate('/auth/sign-in')
      return
    }
    
    // Quick fade out before route change
    gsap.to('main', {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => navigate('/auth/sign-in')
    })
  }

  return (
    <section
      className="relative overflow-hidden px-6 py-[var(--landing-section-pad-y)] md:px-16 lg:px-24"
      style={{ background: 'var(--color-bg-canvas)' }}
      aria-label="Get started"
    >
      <div className="mx-auto max-w-[var(--container-max)]">


        {/* Headline — massive display */}
        <div className="mt-6 overflow-hidden">
          <motion.h2
            className="font-display leading-none text-primary"
            style={{
              fontSize: 'clamp(3.5rem, 6vw + 1.5rem, 10rem)',
              letterSpacing: '0.1em',
            }}
            initial={prefersReducedMotion ? false : { y: '110%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {headline}
          </motion.h2>
        </div>

        {/* Subhead */}
        <motion.p
          className="mt-6 max-w-[38ch] text-sm leading-relaxed text-secondary"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}
        >
          {subhead}
        </motion.p>

        {/* CTA group */}
        <motion.div
          className="mt-10 flex items-center gap-5"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
        >
          {/* Primary CTA — Caramel fill, square, restrained */}
          <button
            className="group focus-ring inline-flex items-center gap-3 border border-accent bg-accent px-8 py-4 font-display text-sm tracking-widest text-accent-fg transition-all duration-200 ease-out hover:bg-accent-hover hover:border-accent-hover active:scale-[0.98] disabled:opacity-80 disabled:pointer-events-none"
            style={{ borderRadius: '2px' }}
            onClick={handleNavigateAuth}
            disabled={isNavigating}
          >
            {cta}
            {!isNavigating && (
              <ArrowRight
                className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1.5"
                strokeWidth={2}
              />
            )}
          </button>

          {/* Secondary — ghost link */}
          <button
            className="focus-ring font-mono text-xs tracking-widest text-muted uppercase transition-colors duration-150 hover:text-secondary disabled:opacity-50"
            onClick={handleNavigateAuth}
            disabled={isNavigating}
          >
            {secondary}
          </button>
        </motion.div>

        {/* Bottom metadata — technical micro-typography */}
        <motion.div
          className="mt-20 flex items-center gap-4"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="h-px w-8 bg-line" />
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
            Local Engine · Hybrid Classical-Quantum Inference
          </span>
        </motion.div>
      </div>
    </section>
  )
}
