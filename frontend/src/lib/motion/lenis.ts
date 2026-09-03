import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { router } from '@/app/router'
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion'

let lenisInstance: Lenis | null = null

/** The single shared Lenis instance, or null when uninitialized/reduced-motion. */
export function getLenis(): Lenis | null {
  return lenisInstance
}

/**
 * Initializes smooth scrolling for landing page GSAP ScrollTrigger animations,
 * but explicitly stops and bypasses Lenis on all /app/* and /auth/* routes so
 * that native vertical scrolling in the main application shell is never intercepted.
 */
export function useLenisSetup(): void {
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const shouldPrevent = (node: HTMLElement) => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        if (path.startsWith('/app') || path.startsWith('/auth')) {
          return true
        }
      }
      return Boolean(node.closest('main, [data-lenis-prevent]'))
    }

    const lenis = new Lenis({
      duration: 1.1,
      prevent: shouldPrevent,
    })
    lenisInstance = lenis

    const update = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    const syncRoute = (pathname: string) => {
      if (pathname.startsWith('/app') || pathname.startsWith('/auth')) {
        lenis.stop()
      } else {
        lenis.start()
      }
    }

    syncRoute(window.location.pathname)
    const unsubscribe = router.subscribe((state) => {
      syncRoute(state.location.pathname)
    })

    return () => {
      unsubscribe()
      gsap.ticker.remove(update)
      lenis.destroy()
      lenisInstance = null
    }
  }, [prefersReducedMotion])
}

