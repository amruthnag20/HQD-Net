import type { Transition, Variants } from 'framer-motion'
import { motionDuration, motionEase } from './tokens'

const standardTransition: Transition = {
  duration: motionDuration.standard,
  ease: motionEase.standard,
}

/** Popover open/close — small opacity + translate, ~200ms. */
export const popoverVariants: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: standardTransition,
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: motionDuration.micro, ease: motionEase.exit },
  },
}

/** Modal Dialog open/close — fade + subtle scale settle. */
export const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: motionDuration.standard, ease: motionEase.enter },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: { duration: motionDuration.micro, ease: motionEase.exit },
  },
}

/** Off-canvas drawer (mobile nav) — slide in from the left + backdrop fade. */
export const drawerPanelVariants: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { duration: motionDuration.major, ease: motionEase.enter } },
  exit: { x: '-100%', transition: { duration: motionDuration.standard, ease: motionEase.exit } },
}

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motionDuration.standard } },
  exit: { opacity: 0, transition: { duration: motionDuration.standard } },
}

/** Route-level page transition — quiet fade + tiny vertical settle (250–350ms). */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.major, ease: motionEase.enter },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: motionDuration.micro, ease: motionEase.exit },
  },
}

/** Tooltip — fast fade, no motion overshoot. */
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, y: 2 },
  visible: { opacity: 1, y: 0, transition: { duration: motionDuration.micro } },
  exit: { opacity: 0, y: 2, transition: { duration: motionDuration.micro } },
}

/** Toast notifications — slide up from bottom right. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: motionDuration.standard, ease: motionEase.enter },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: { duration: motionDuration.micro, ease: motionEase.exit },
  },
}

/** Simple fade in/out. */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motionDuration.standard } },
  exit: { opacity: 0, transition: { duration: motionDuration.micro } },
}

/** Slide up subtle. */
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: motionDuration.standard, ease: motionEase.enter } },
  exit: { opacity: 0, y: -6, transition: { duration: motionDuration.micro, ease: motionEase.exit } },
}

/** Landing nav entrance — logo fades/settles in, nav items stagger ~50ms apart. */
export const navContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}

export const navItemVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: motionDuration.standard, ease: motionEase.enter } },
}

/** Generic scroll-triggered section reveal — quiet fade + small settle, used with whileInView. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: motionDuration.major, ease: motionEase.enter } },
}
