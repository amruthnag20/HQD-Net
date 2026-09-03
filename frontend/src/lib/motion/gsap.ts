/**
 * GSAP ownership: cinematic sequences, complex timeline choreography, and
 * scroll-driven effects — reserved for future landing-page work. There is
 * no cinematic motion in the authenticated app shell, so nothing here is
 * consumed yet; this file exists to fix the convention before that work
 * starts, not to be imported today.
 *
 * Convention for whoever builds that motion:
 *
 *   useLayoutEffect(() => {
 *     const ctx = gsap.context(() => {
 *       gsap.timeline()....
 *     }, scopeRef)
 *     return () => ctx.revert() // always clean up — kills tweens + ScrollTriggers
 *   }, [])
 *
 * Register plugins once, at the call site that needs them (e.g. ScrollTrigger
 * only in the landing page module), not globally here, to keep this module
 * side-effect-free until it's actually used.
 */
export {}
