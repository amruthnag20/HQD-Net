/**
 * Motion constants — the single source of truth for Framer Motion timing.
 * Mirrors the duration/ease custom properties in styles/tokens.css.
 */
export const motionDuration = {
  instant: 0.1,
  micro: 0.15,
  standard: 0.25,
  major: 0.35,
  slow: 0.5,
} as const

export const motionEase = {
  standard: [0.4, 0, 0.2, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  emphasized: [0.2, 0, 0, 1],
} as const

export const motionSpring = {
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
  precise: { type: 'spring', stiffness: 350, damping: 35, mass: 0.8 },
} as const
