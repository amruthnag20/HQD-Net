import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { NavigationItem } from './NavigationItem'
import { navItems } from './navItems'
import { IconButton } from '@/components/ui/IconButton'
import { Tooltip } from '@/components/ui/Tooltip'
import { motionDuration, motionEase } from '@/lib/motion/tokens'

/** Desktop/tablet navigation rail — collapsed by default, expands on the toggle control. */
export function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.aside
      animate={{ width: expanded ? 236 : 68 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: motionDuration.standard, ease: motionEase.standard }
      }
      className="z-sidebar hidden h-screen shrink-0 flex-col border-r border-line bg-surface md:flex"
    >
      <div
        className={
          expanded
            ? 'flex h-[60px] items-center justify-between border-b border-line px-4'
            : 'flex flex-col items-center justify-center gap-2 border-b border-line py-3 px-0'
        }
      >
        <Link
          to="/"
          className="focus-ring rounded-sm font-display text-primary flex items-center justify-center"
          aria-label="HQD-Net — return to landing"
        >
          {expanded ? (
            <span className="text-lg leading-none tracking-wide">HQD-Net</span>
          ) : (
            <span className="text-base leading-none tracking-wider">HQ</span>
          )}
        </Link>

        {expanded ? (
          <IconButton
            icon={<PanelLeftClose className="size-[18px]" strokeWidth={1.5} />}
            aria-label="Collapse navigation"
            size="sm"
            onClick={() => setExpanded(false)}
          />
        ) : (
          <Tooltip content="Expand navigation" side="right" className="flex justify-center">
            <IconButton
              icon={<PanelLeftOpen className="size-[18px]" strokeWidth={1.5} />}
              aria-label="Expand navigation"
              size="sm"
              onClick={() => setExpanded(true)}
            />
          </Tooltip>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-2" aria-label="Primary">
        {navItems.map((item) => (
          <NavigationItem key={item.to} {...item} collapsed={!expanded} />
        ))}
      </nav>
    </motion.aside>
  )
}
