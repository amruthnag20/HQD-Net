import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { landingCopy } from '@/content/landingCopy'
import { usePrefersReducedMotion } from '@/lib/utils/usePrefersReducedMotion'

export type HeroProps = {
  onCtaHoverChange?: (hovered: boolean) => void
}

/**
 * Hero — centered editorial composition.
 *
 * GSAP timeline (one-shot, skipped under reduced-motion):
 *  1. Technical coordinate + eyebrow line 1 → masked reveal
 *  2. Eyebrow line 2 → masked reveal
 *  3. HQD-NET wordmark → masked vertical reveal (the WOW moment)
 *  4. Subhead → opacity + y settle
 *  5. Tagline + CTA group → opacity settle
 */
export function Hero({ onCtaHoverChange }: HeroProps) {
  const navigate = useNavigate()
  const scopeRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })



      // 2. Eyebrow line 1 — masked reveal from below
      tl.from('.hero-eyebrow-1 .clip-inner', { y: '110%', duration: 0.6 }, '-=0.1')

      // 3. Eyebrow line 2
      tl.from('.hero-eyebrow-2 .clip-inner', { y: '110%', duration: 0.5 }, '-=0.35')

      // 4. HQD-NET wordmark — the signature moment: masked vertical reveal
      tl.from('.hero-wordmark .clip-inner', { y: '115%', duration: 0.9, ease: 'power4.out' }, '-=0.2')


      // 6. Subhead
      tl.from('.hero-subhead', { opacity: 0, y: 14, duration: 0.5 }, '-=0.3')

      // 7. Tagline + CTA
      tl.from('.hero-tagline', { opacity: 0, y: 8, duration: 0.4 }, '-=0.3')
      tl.from('.hero-cta-group', { opacity: 0, y: 10, duration: 0.45 }, '-=0.35')
    }, scopeRef)

    return () => ctx.revert()
  }, [prefersReducedMotion])

  const [isNavigating, setIsNavigating] = useState(false)

  const handleNavigateAuth = () => {
    if (isNavigating) return
    setIsNavigating(true)

    if (prefersReducedMotion) {
      navigate('/auth/sign-in')
      return
    }

    // Trigger computational convergence
    gsap.to('.field-path, .quantum-path', {
      strokeOpacity: 0.1,
      duration: 0.5,
      ease: 'power2.inOut',
    })
    
    gsap.to('.field-zone-quantum circle', {
      scale: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: 'back.in(2)',
    })

    gsap.to(scopeRef.current, {
      opacity: 0,
      scale: 0.98,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => navigate('/auth/sign-in'),
    })
  }

  return (
    <div
      ref={scopeRef}
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-[var(--header-height)] text-center"
    >


      {/* Eyebrow: HYBRID QUANTUM */}
      <div className="hero-eyebrow-1 clip-reveal overflow-hidden">
        <p className="clip-inner font-display text-[clamp(1.5rem,3vw+0.5rem,3.25rem)] leading-none tracking-wide text-primary">
          {landingCopy.hero.eyebrowLine1}
        </p>
      </div>

      {/* Eyebrow: DIAGNOSTIC NETWORK */}
      <div className="hero-eyebrow-2 clip-reveal overflow-hidden mt-1">
        <p className="clip-inner font-display text-[clamp(1.5rem,3vw+0.5rem,3.25rem)] leading-none tracking-wide text-primary">
          {landingCopy.hero.eyebrowLine2}
        </p>
      </div>

      {/* HQD-Net — the signature wordmark */}
      <div className="hero-wordmark clip-reveal overflow-hidden mt-3">
        <h1
          className="clip-inner font-display text-[length:var(--text-hero)] leading-none text-primary"
          style={{ letterSpacing: '0.04em' }}
        >
          {landingCopy.hero.heading}
        </h1>
      </div>

      {/* Subhead */}
      <p className="hero-subhead mt-7 max-w-[36ch] text-sm leading-relaxed text-secondary sm:text-base">
        {landingCopy.hero.subhead}
      </p>

      {/* Tagline — technical descriptor */}
      <p className="hero-tagline mt-4 font-mono text-xs tracking-widest text-muted uppercase">
        {landingCopy.hero.tagline}
      </p>

      {/* CTA group */}
      <div className="hero-cta-group mt-8 flex items-center gap-4">
        {/* Primary — Begin Analysis */}
        <button
          className="group focus-ring inline-flex items-center gap-2 border border-accent bg-accent px-10 py-3.5 font-display text-sm tracking-widest text-accent-fg transition-all duration-200 ease-out hover:bg-accent-hover hover:border-accent-hover active:scale-[0.98]"
          style={{ borderRadius: '2px' }}
          onMouseEnter={() => onCtaHoverChange?.(true)}
          onMouseLeave={() => onCtaHoverChange?.(false)}
          onClick={handleNavigateAuth}
          disabled={isNavigating}
        >
          {landingCopy.hero.primaryCta}
          <ArrowRight
            className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1"
            strokeWidth={2}
          />
        </button>

        {/* Ghost — Sign in */}
        <button
          className="focus-ring inline-flex items-center gap-2 border border-line px-6 py-3 font-mono text-xs tracking-widest text-muted uppercase transition-all duration-200 ease-out hover:border-line-strong hover:text-secondary active:scale-[0.98]"
          style={{ borderRadius: '2px' }}
          onClick={handleNavigateAuth}
          disabled={isNavigating}
        >
          {landingCopy.hero.secondaryCta}
        </button>
      </div>
    </div>
  )
}
