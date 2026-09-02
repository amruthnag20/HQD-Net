import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero } from './Hero'
import { ArchitectureSection } from './ArchitectureSection'
import { ComputationalField } from './ComputationalField'
import { useLenisScrollTriggerSync } from '@/lib/motion/scrollSync'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'

/**
 * Owns the single ComputationalField instance that bridges Hero and
 * ArchitectureSection — the SVG covers the full hero section as a
 * full-bleed background layer, centered, and scrolls out gracefully
 * as the user moves to the next section.
 *
 * The field is drawn in with a GSAP timeline that is sequenced AFTER
 * the hero typography reveals complete (~3.2s into page load).
 */
export function HeroArchitectureFlow() {
  const [ctaHover, setCtaHover] = useState(false)
  const fieldRef = useRef<SVGSVGElement>(null)
  const heroSectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useLenisScrollTriggerSync()

  useLayoutEffect(() => {
    if (prefersReducedMotion || !heroSectionRef.current || !fieldRef.current) return

    const ctx = gsap.context(() => {
      // Path draw-in: reveal all field paths after typography settles
      const allPaths = gsap.utils.toArray<SVGPathElement | SVGLineElement>('.field-path')
      if (allPaths.length > 0) {
        // Paths were initialized to dashoffset=length in ComputationalField.
        // Animate them in with a stagger, starting at ~3.0s into page load.
        gsap.to(allPaths, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: 'power2.inOut',
          stagger: { each: 0.04, from: 'start' },
          delay: 3.0,
        })
      }

      // Scroll-driven: field softly scales and fades as user scrolls past hero.
      // No pinning — normal document scroll, just a scrubbed transform.
      gsap.to(fieldRef.current, {
        scale: 0.85,
        opacity: 0.12,
        ease: 'none',
        scrollTrigger: {
          trigger: heroSectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
        },
      })

      // Refresh after fonts settle — Big Shoulders Display shifts section heights.
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }, heroSectionRef)

    return () => ctx.revert()
  }, [prefersReducedMotion])

  return (
    <div className="relative">
      <section
        ref={heroSectionRef}
        className="relative min-h-screen overflow-hidden"
      >
        {/* Full-bleed computational field — behind everything, centered */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <ComputationalField
            ref={fieldRef}
            className="w-full h-full max-w-none"
            style={{ opacity: prefersReducedMotion ? 0.35 : 0.5 } as CSSProperties}
            hoverActive={ctaHover}
          />
        </div>

        {/* Vignette — radial gradient to ground the typography */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 55% 60% at 50% 50%, transparent 0%, var(--color-bg-canvas) 80%)',
          }}
        />

        {/* Hero typography on top */}
        <Hero onCtaHoverChange={setCtaHover} />
      </section>

      <ArchitectureSection />
    </div>
  )
}
