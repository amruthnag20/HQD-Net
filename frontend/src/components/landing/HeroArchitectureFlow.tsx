import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero } from './Hero'
import { ArchitectureSection } from './ArchitectureSection'
import { ComputationalField } from './ComputationalField'
import { HeroCinematicCanvas } from './HeroCinematicCanvas'
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

    // Declared outside gsap.context — its callback's return value isn't
    let onPointerMove: ((event: PointerEvent) => void) | null = null
    let pointerRaf = 0

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

      // Scroll parallax — depth layers recede at different rates as the
      // hero scrolls away, giving the thread field real spatial depth.
      const depthScrollRates: [selector: string, distance: number][] = [
        ['.field-depth-back', -30],
        ['.field-depth-mid', -65],
        ['.field-depth-dna', -85],
        ['.field-depth-front', -115],
      ]
      depthScrollRates.forEach(([selector, distance]) => {
        gsap.to(selector, {
          y: distance,
          ease: 'none',
          scrollTrigger: {
            trigger: heroSectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.2,
          },
        })
      })

      // Pointer parallax — horizontal drift toward the cursor, layered by
      // depth (front threads react most, back threads barely move). Skipped
      // on touch input since there's no persistent pointer to track.
      const depthPointerRates: [selector: string, range: number][] = [
        ['.field-depth-back', 5],
        ['.field-depth-mid', 11],
        ['.field-depth-dna', 14],
        ['.field-depth-front', 18],
      ]
      const quickSetters = depthPointerRates.map(
        ([selector, range]) => [gsap.quickTo(selector, 'x', { duration: 0.9, ease: 'power3.out' }), range] as const,
      )

      onPointerMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        const clientX = event.clientX
        if (pointerRaf) return
        pointerRaf = requestAnimationFrame(() => {
          const nx = (clientX / window.innerWidth) * 2 - 1
          quickSetters.forEach(([setX, range]) => setX(nx * range))
          pointerRaf = 0
        })
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true })

      // Refresh after fonts settle — Big Shoulders Display shifts section heights.
      document.fonts.ready.then(() => ScrollTrigger.refresh())
    }, heroSectionRef)

    return () => {
      cancelAnimationFrame(pointerRaf)
      if (onPointerMove) window.removeEventListener('pointermove', onPointerMove)
      ctx.revert()
    }
  }, [prefersReducedMotion])

  return (
    <div className="relative">
      <section
        ref={heroSectionRef}
        className="relative min-h-screen overflow-hidden"
      >
        {/* Cinematic canvas background — all hero layers in one rAF loop:
            atmosphere → quantum-field → wave-field → network → DNA → pulses → vignette */}
        <HeroCinematicCanvas />

        {/* Full-bleed computational field — architecture SVG behind text */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
          style={{ zIndex: 1 }}
        >
          <ComputationalField
            ref={fieldRef}
            className="w-full h-full max-w-none"
            style={{ opacity: prefersReducedMotion ? 0.26 : 0.36 } as CSSProperties}
            hoverActive={ctaHover}
          />
        </div>

        {/* Text-safe zone — a feathered backdrop-blur panel sitting between
            the background layers and the typography, so the DNA/network/
            wave-field can be genuinely vivid at the edges while nothing
            ever renders crisp directly behind the title, subtitle, or CTA
            row. Masked (not just faded) so the blur itself fades out
            toward the edges rather than ending in a hard rectangle. */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            zIndex: 2,
            background:
              'radial-gradient(ellipse 55% 60% at 50% 44%, var(--color-bg-canvas) 0%, rgba(244, 254, 255, 0.5) 65%, transparent 100%)',
          }}
        />

        {/* Hero typography on top */}
        <Hero onCtaHoverChange={setCtaHover} />
      </section>

      <ArchitectureSection />
    </div>
  )
}
