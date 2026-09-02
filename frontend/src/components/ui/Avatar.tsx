import { cn } from '@/lib/utils/cn'

export type AvatarProps = {
  name: string
  size?: 'sm' | 'md'
  imageUrl?: string
  className?: string
}

const sizeClass = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
} as const

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Initials-based avatar — no image asset dependency. imageUrl is future-proofing, unused in Phase 1 mock data. */
export function Avatar({ name, size = 'md', imageUrl, className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn('rounded-full object-cover', sizeClass[size], className)}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent-muted font-medium text-accent',
        sizeClass[size],
        className,
      )}
      aria-hidden="true"
    >
      {initialsFrom(name)}
    </span>
  )
}
