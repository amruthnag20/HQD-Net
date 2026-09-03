import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageVariants } from '@/lib/motion/variants'

/** Route-level transition. Used in place of a bare <Outlet/> in every layout. */
export function PageTransition() {
  const location = useLocation()
  const element = useOutlet()
  const prefersReducedMotion = useReducedMotion()

  // The app scrolls inside #main-scroll-container, not the window, so
  // react-router's <ScrollRestoration> (window-scroll only) can't help here.
  // Without this, navigating from a long page to a short one can leave the
  // new page scrolled below its own content — apparently blank.
  useEffect(() => {
    const el = document.getElementById('main-scroll-container')
    if (!el) return
    el.scrollTop = 0
    const raf = requestAnimationFrame(() => {
      el.scrollTop = 0
    })
    return () => cancelAnimationFrame(raf)
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={prefersReducedMotion ? undefined : pageVariants}
        className="w-full min-h-full"
      >
        {element}
      </motion.div>
    </AnimatePresence>
  )
}
