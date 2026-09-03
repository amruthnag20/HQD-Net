import { useReducedMotion } from 'framer-motion'

/**
 * Check whether reduced motion is preferred globally.
 */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Hook to access reduced motion preference across components.
 */
export function usePrefersReducedMotion(): boolean {
  const reduced = useReducedMotion()
  return Boolean(reduced)
}
