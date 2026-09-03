import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLenis } from './lenis'
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion'

let registered = false

/**
 * Keeps GSAP ScrollTrigger's measurements in sync with Lenis's smoothed
 * scroll position. No scrollerProxy is needed: Lenis (default config, no
 * custom wrapper/content targets) smooths the real native `window` scroll,
 * so ScrollTrigger's default window scroller already reads correct values —
 * it just needs to recompute on every Lenis tick, since Lenis's smoothed
 * intermediate frames don't all coincide with throttled native scroll
 * events. Call once, from the component that owns scroll-driven animation
 * (HeroArchitectureFlow), not from every component that merely scrolls.
 */
export function useLenisScrollTriggerSync(): void {
  const prefersReducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    if (prefersReducedMotion) return

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger)
      registered = true
    }

    const lenis = getLenis()
    const onScroll = () => ScrollTrigger.update()
    lenis?.on('scroll', onScroll)

    return () => {
      lenis?.off('scroll', onScroll)
    }
  }, [prefersReducedMotion])
}
