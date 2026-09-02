import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageVariants } from '@/lib/motion/variants'

/** Route-level transition. Used in place of a bare <Outlet/> in every layout. */
export function PageTransition() {
  const location = useLocation()
  const element = useOutlet()
  const prefersReducedMotion = useReducedMotion()

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
