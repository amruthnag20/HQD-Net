import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { landingCopy } from '@/content/landingCopy'

// The page's closing "font revelation" — each word of the headline
// materializes out of a soft blur and a masked vertical reveal, staggered
// word-by-word. This mirrors the Hero wordmark's masked reveal, so the page
// opens and closes on the same signature typographic gesture.
const headlineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
}
// Framer Motion v13's Variants type only accepts its named Easing strings for
// `ease`, not a cubic-bezier array or CSS string (see EvidenceSection for
// precedent) — 'circOut' gives the same "settling into focus" curve.
const headlineWord = {
  hidden: { y: '100%', filter: 'blur(16px)' },
  visible: {
    y: '0%',
    filter: 'blur(0px)',
    transition: { duration: 1.1, ease: 'circOut' as const },
  },
}

/**
 * Final CTA — ENTER HQD-NET.
 *
 * The culmination of the page experience.
 * Large display headline with a cinematic font revelation. Restrained
 * editorial button. No pill. Subtle top rule in Royal Blue to close the
 * paper section's visual energy.
 */
export function FinalCta() {
  const navigate = useNavigate()
  const { headline, subhead, cta, secondary } = landingCopy.finalCta
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end end'] })
  const glowY = useTransform(scrollYProgress, [0, 1], [prefersReducedMotion ? 0 : -40, 0])

  const words = headline.split(' ')

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
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-[var(--landing-section-pad-y)] md:px-16 lg:px-24"
      style={{ background: 'var(--color-bg-canvas)' }}
      aria-label="Get started"
    >
      {/* Ambient glow — a quiet echo of the hero's quantum core, drifting
          gently as the section scrolls into place. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          y: glowY,
          background:
            'radial-gradient(ellipse 45% 55% at 22% 25%, rgba(14,47,118,0.06), transparent 65%)',
        }}
      />

      <div className="relative mx-auto max-w-[var(--container-max)]">


        {/* Headline — massive display, word-by-word font revelation */}
        <motion.h2
          className="font-display leading-none text-primary mt-6 flex flex-wrap"
          style={{
            fontSize: 'clamp(3.5rem, 6vw + 1.5rem, 10rem)',
            letterSpacing: '0.1em',
          }}
          initial={prefersReducedMotion ? undefined : 'hidden'}
          whileInView={prefersReducedMotion ? undefined : 'visible'}
          viewport={{ once: true, margin: '-100px' }}
          variants={prefersReducedMotion ? undefined : headlineContainer}
        >
          {words.map((word, i) => (
            <span key={i} className="overflow-hidden pb-[0.1em] pr-[0.22em] inline-block">
              <motion.span className="inline-block" variants={prefersReducedMotion ? undefined : headlineWord}>
                {word}
              </motion.span>
            </span>
          ))}
        </motion.h2>

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
          {/* Primary CTA — Royal Blue fill, square, restrained */}
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
