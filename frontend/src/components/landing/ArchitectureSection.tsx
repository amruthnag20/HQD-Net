import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { landingCopy } from '@/content/landingCopy'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'

/**
 * Architecture section — CLASSICAL → QUANTUM → CLINICAL TRANSLATION.
 *
 * NOT three identical cards.
 *
 * Composition:
 *  - Full dark canvas (continuous from hero)
 *  - Section coordinate + headline (editorial weight)
 *  - A vertical connective spine (SVG): Royal Blue vertical line with
 *    Powder Blue nodes at each stage — draws in on scroll
 *  - Three stages as editorial text blocks beside the spine
 *  - Each stage: large number + tall label + technical descriptor + body
 *  - GSAP ScrollTrigger: spine draws, then stages stagger in
 */
export function ArchitectureSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const spineRef = useRef<SVGLineElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const { headline, stages } = landingCopy.architecture

  useLayoutEffect(() => {
    if (prefersReducedMotion || !sectionRef.current) return

    // Register ScrollTrigger (may already be registered by HeroArchitectureFlow)
    gsap.registerPlugin(ScrollTrigger)

    const isDesktop = window.matchMedia('(min-width: 768px)').matches

    const ctx = gsap.context(() => {
      // Spine fill — continuously scrubbed to how far the viewer has
      // actually scrolled through the pipeline, not a fixed-duration tween.
      // This is what makes the timeline read as "progress", not "reveal".
      if (spineRef.current) {
        const spineLength = spineRef.current.getTotalLength?.() ?? 500
        gsap.set(spineRef.current, { strokeDasharray: spineLength, strokeDashoffset: spineLength })
        gsap.to(spineRef.current, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            end: 'bottom 55%',
            scrub: 0.6,
          },
        })
      }

      // Each stage gets its own scroll-scrubbed cinematic reveal — blur
      // resolves into focus, content settles in, and its spine node lights
      // up as that stage crosses into view. Desktop only: on narrow
      // viewports (and reduced motion) everything is simply visible, no
      // per-stage motion, so the pipeline never blocks reading on mobile.
      if (isDesktop) {
        gsap.utils.toArray<HTMLElement>('.arch-stage').forEach((stage, i) => {
          const trigger = {
            trigger: stage,
            start: 'top 88%',
            end: 'top 45%',
            scrub: 0.6,
          }
          gsap.fromTo(
            stage,
            { opacity: 0, x: 28, filter: 'blur(8px)' },
            { opacity: 1, x: 0, filter: 'blur(0px)', ease: 'none', scrollTrigger: trigger },
          )

          const node = document.querySelectorAll('.arch-node')[i]
          if (node) {
            gsap.fromTo(
              node,
              { scale: 0.3, opacity: 0.3, transformOrigin: '50% 50%' },
              { scale: 1, opacity: 1, ease: 'none', scrollTrigger: trigger },
            )
          }
        })
      } else {
        gsap.set('.arch-stage', { opacity: 1, x: 0, filter: 'blur(0px)' })
        gsap.set('.arch-node', { scale: 1, opacity: 1 })
      }

      // Headline
      gsap.from('.arch-headline .clip-inner', {
        y: '110%',
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [prefersReducedMotion])

  // Spine SVG dimensions
  const spineX = 28
  const nodeY = [40, 240, 440] // y positions for the three stage nodes
  const spineTop = nodeY[0]
  const spineBottom = nodeY[nodeY.length - 1]

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-[var(--landing-section-pad-y)] md:px-16 lg:px-24"
      style={{ background: 'var(--color-bg-surface)' }}
      aria-label="How HQD-Net runs"
    >


      <div className="mx-auto max-w-[var(--container-max)]">
        {/* Section header */}
        <div className="mb-12 md:mb-16">
          <div className="arch-headline clip-reveal overflow-hidden">
            <h2
              className="clip-inner font-display text-[length:var(--text-section)] leading-none text-primary"
              style={{ letterSpacing: '0.08em' }}
            >
              {headline}
            </h2>
          </div>
        </div>

        {/* Main composition: spine + stages side by side */}
        <div className="flex items-start gap-8 md:gap-12">
          {/* ---- Connective spine (SVG) ---- */}
          <div
            className="relative shrink-0"
            style={{ width: 56 }}
            aria-hidden="true"
          >
            <svg
              width="56"
              height="550"
              viewBox="0 0 56 550"
              fill="none"
              className="overflow-visible"
            >
              {/* Vertical spine line — Royal Blue */}
              <line
                ref={spineRef}
                x1={spineX}
                y1={spineTop}
                x2={spineX}
                y2={spineBottom}
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />

              {/* Stage nodes — Powder Blue circles */}
              {nodeY.map((y, i) => (
                <g key={i} className="arch-node">
                  {/* Outer ring */}
                  <circle
                    cx={spineX}
                    cy={y}
                    r={10}
                    stroke="var(--color-baby)"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    fill="none"
                  />
                  {/* Inner filled circle */}
                  <circle
                    cx={spineX}
                    cy={y}
                    r={5}
                    fill="var(--color-baby)"
                    fillOpacity="0.85"
                  />
                </g>
              ))}

              {/* Horizontal connector from each node to stage content */}
              {nodeY.map((y, i) => (
                <line
                  key={`h${i}`}
                  x1={spineX + 10}
                  y1={y}
                  x2={56}
                  y2={y}
                  stroke="var(--color-accent)"
                  strokeWidth="0.75"
                  strokeOpacity="0.3"
                />
              ))}
            </svg>
          </div>

          {/* ---- Stage content ---- */}
          <div className="relative flex-1 w-full" style={{ minHeight: 550 }}>
            {stages.map((stage, i) => (
              <div
                key={stage.id}
                className="arch-stage absolute inset-x-0 flex flex-col gap-3"
                style={{ top: `${nodeY[i] - 16}px` }}
              >
                {/* Number + label row */}
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs tracking-widest text-muted">
                    {stage.number}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3
                      className="font-display leading-none text-primary"
                      style={{
                        fontSize: 'clamp(1.75rem, 2.5vw + 0.75rem, 3rem)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {stage.label}
                    </h3>
                    <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                      {stage.sublabel}
                    </span>
                  </div>
                </div>

                {/* Body copy */}
                <p className="max-w-[44ch] text-sm leading-relaxed text-secondary">
                  {stage.body}
                </p>

                {/* Technical descriptor — mono badge */}
                <p className="font-mono text-[10px] tracking-widest text-secondary uppercase">
                  {stage.technical}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Flow label — bottom of section */}
        <div className="mt-20 flex items-center gap-3">

          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
            Classical → Quantum → Classical
          </span>
        </div>
      </div>
    </section>
  )
}
