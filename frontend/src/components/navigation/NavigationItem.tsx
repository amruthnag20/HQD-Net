import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils/cn'

export type NavigationItemProps = {
  to: string
  icon: LucideIcon
  label: string
  collapsed: boolean
  onNavigate?: () => void
}

export function NavigationItem({ to, icon: Icon, label, collapsed, onNavigate }: NavigationItemProps) {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex items-center rounded-md text-xs font-mono uppercase tracking-wider transition-colors duration-150 ease-out',
          isActive
            ? 'bg-surface-subtle text-primary font-semibold'
            : 'text-secondary hover:bg-surface-subtle/60 hover:text-primary',
          collapsed ? 'h-10 w-full justify-center px-0' : 'h-10 w-full gap-3 px-3.5',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-accent"
              aria-hidden="true"
            />
          ) : null}
          <Icon className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
          {!collapsed ? <span className="truncate">{label}</span> : null}
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip content={label} side="right" className="w-full flex justify-center">
        {link}
      </Tooltip>
    )
  }

  return link
}
