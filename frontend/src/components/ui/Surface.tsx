import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type Elevation = 'surface' | 'raised' | 'sunken'

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: Elevation
  bordered?: boolean
  radius?: 'sm' | 'md' | 'lg' | 'none'
}

const elevationClass: Record<Elevation, string> = {
  surface: 'bg-surface',
  raised: 'bg-surface-raised',
  sunken: 'bg-sunken',
}

const radiusClass: Record<NonNullable<SurfaceProps['radius']>, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-lg',
  lg: 'rounded-2xl',
}

/** Base elevated background block. Panel, Popover, and Drawer compose this. */
export function Surface({
  elevation = 'surface',
  bordered = true,
  radius = 'lg',
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        elevationClass[elevation],
        radiusClass[radius],
        bordered && 'border border-line-subtle shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
