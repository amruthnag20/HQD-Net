import { cn } from '@/lib/utils/cn'

export type SkeletonProps = {
  width?: string | number
  height?: string | number
  radius?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

const radiusClass = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const

/** Flat pulse block — animate-pulse is opacity-only and freezes under prefers-reduced-motion (global.css). */
export function Skeleton({ width, height, radius = 'md', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-surface-raised', radiusClass[radius], className)}
      style={{ width, height }}
    />
  )
}
