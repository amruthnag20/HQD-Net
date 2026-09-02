import { motion, useReducedMotion } from 'framer-motion'
import { landingCopy } from '@/content/landingCopy'

// Note: Framer Motion v13 Variants type does not accept number[] for ease.
// Use string cubic-bezier notation instead.
const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const, delay: i * 0.1 },
  }),
}

/**
 * Evidence section — "EVIDENCE / OVER HYPE" as a major typographic statement.
 *
 * Composition:
 *  - Ice White paper surface (light, editorial contrast)
 *  - Left: massive stacked headline + subhead + evidence list
 *  - Right: large single-line technical callouts (ink on paper, high weight)
 *  - A thin Royal Blue rule separates the two columns
 *  - No fake metrics. No cards. No bento.
 */
export function EvidenceSection() {
  const { headlineLine1, headlineLine2, subhead, points } = landingCopy.evidence
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      className="relative overflow-hidden px-6 py-[var(--landing-section-pad-y)] md:px-16 lg:px-24"
      style={{ background: 'var(--color-paper)' }}
      aria-label="Evidence over hype"
    >
      {/* Very faint construction lines — editorial scaffolding on paper */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(14,47,118,0.05) 1px, transparent 1px)`,
          backgroundSize: '25% 100%',
        }}
      />

      <div className="relative mx-auto max-w-[var(--container-max)]">


        {/* Large typographic statement — stacked, two weights */}
        <div className="mt-6 overflow-hidden">
          <motion.div
            initial={prefersReducedMotion ? false : { y: '110%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <h2
              className="font-display leading-none text-ink"
              style={{
                fontSize: 'var(--text-section)',
                letterSpacing: '0.07em',
              }}
            >
              {headlineLine1}
            </h2>
          </motion.div>
        </div>
        <div className="overflow-hidden">
          <motion.div
            initial={prefersReducedMotion ? false : { y: '110%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.1 }}
          >
            <h2
              className="font-display leading-none text-ink-secondary"
              style={{
                fontSize: 'var(--text-section)',
                letterSpacing: '0.07em',
              }}
            >
              {headlineLine2}
            </h2>
          </motion.div>
        </div>



        {/* Subhead */}
        <motion.p
          className="mt-6 max-w-[42ch] text-sm leading-relaxed text-ink-secondary"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.35 }}
        >
          {subhead}
        </motion.p>

        {/* Evidence list — two column on md+ */}
        <div className="mt-14 grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-16 lg:gap-24">
          {/* Left: numbered evidence points */}
          <div>
            {points.map((point, i) => (
              <motion.div
                key={point.id}
                className="flex flex-col gap-2 border-t border-ink/10 py-7"
                custom={i}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-xs font-semibold tracking-widest text-ink uppercase">
                    {point.label}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-ink-secondary">{point.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Right: large single-word callouts — editorial emphasis column */}
          <div
            className="hidden md:flex flex-col justify-center gap-8 border-l border-ink/10 pl-16"
          >
            {points.map((point, i) => (
              <motion.div
                key={`callout-${point.id}`}
                custom={i}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 + i * 0.12 }}
              >
                <p
                  className="font-display leading-none text-ink"
                  style={{ fontSize: 'clamp(2rem, 3vw + 0.5rem, 4rem)', letterSpacing: '0.06em', opacity: 0.08 + (i * 0.04) }}
                >
                  {point.label.split(' ')[0].toUpperCase()}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <motion.p
          className="mt-12 font-mono text-[10px] tracking-widest text-ink-muted uppercase"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          No invented metrics. No unverified claims. Evidence is architectural.
        </motion.p>
      </div>
    </section>
  )
}
