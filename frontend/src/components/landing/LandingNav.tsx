import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { IconButton } from '@/components/ui/IconButton'
import { LandingMobileDrawer } from './LandingMobileDrawer'
import { landingCopy } from '@/content/landingCopy'
import { navContainerVariants, navItemVariants } from '@/lib/motion/variants'

export function LandingNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? undefined : navContainerVariants}
      className="fixed inset-x-0 top-0 z-[var(--z-header)] flex h-[var(--header-height)] items-center justify-between border-b border-line-subtle bg-canvas/90 px-6 backdrop-blur-[6px] md:px-10"
    >
      {/* Wordmark — Big Shoulders Display, strong presence */}
      <motion.div variants={prefersReducedMotion ? undefined : navItemVariants}>
        <Link
          to="/"
          className="focus-ring rounded-none font-display text-xl leading-none tracking-[0.12em] text-primary transition-opacity duration-150 hover:opacity-70"
          aria-label="HQD-Net home"
        >
          {landingCopy.nav.wordmark}
        </Link>
      </motion.div>

      {/* Desktop nav */}
      <div className="hidden items-center gap-8 md:flex">
        {/* System status — mono instrument style */}
        <motion.div
          variants={prefersReducedMotion ? undefined : navItemVariants}
          className="flex items-center gap-2"
        >
          <span className="relative flex size-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60"
              style={{ animation: 'status-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
            />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
            {landingCopy.nav.statusMono}
          </span>
        </motion.div>

        {/* Divider */}
        <div className="h-4 w-px bg-line" aria-hidden="true" />

        {/* Sign in — text link style */}
        <motion.div variants={prefersReducedMotion ? undefined : navItemVariants}>
          <button
            className="focus-ring font-mono text-xs tracking-widest text-muted uppercase transition-colors duration-150 ease-out hover:text-primary"
            onClick={() => navigate('/auth/sign-in')}
          >
            {landingCopy.nav.signIn}
          </button>
        </motion.div>

        {/* Sign up — editorial border button, square corners, Caramel accent */}
        <motion.div variants={prefersReducedMotion ? undefined : navItemVariants}>
          <button
            className="focus-ring inline-flex items-center border border-accent px-4 py-2 font-display text-xs tracking-widest text-accent transition-all duration-150 ease-out hover:bg-accent hover:text-accent-fg active:scale-[0.97]"
            style={{ borderRadius: '2px' }}
            onClick={() => navigate('/auth/sign-up')}
          >
            {landingCopy.nav.signUp}
          </button>
        </motion.div>
      </div>

      {/* Mobile menu trigger */}
      <motion.div
        variants={prefersReducedMotion ? undefined : navItemVariants}
        className="md:hidden"
      >
        <IconButton
          icon={<Menu className="size-[18px]" strokeWidth={1.5} />}
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        />
      </motion.div>

      <LandingMobileDrawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </motion.header>
  )
}
