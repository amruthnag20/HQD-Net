import { useEffect, useState } from 'react'

/** Generic breakpoint hook. Pass a raw media query string, e.g. "(min-width: 1024px)". */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const onChange = () => setMatches(mediaQuery.matches)
    onChange()
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const breakpoints = {
  tablet: '(min-width: 768px)',
  desktop: '(min-width: 1024px)',
} as const
