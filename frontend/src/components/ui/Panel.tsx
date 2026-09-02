import type { ReactNode } from 'react'
import { Surface, type SurfaceProps } from './Surface'
import { cn } from '@/lib/utils/cn'

export type PanelProps = SurfaceProps & {
  title?: ReactNode
  eyebrow?: ReactNode
}

/** Bordered content container with an architectural, restrained corner radius. */
export function Panel({ title, eyebrow, children, className, ...props }: PanelProps) {
  return (
    <Surface className={cn('p-6', className)} {...props}>
      {eyebrow ? (
        <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">{eyebrow}</p>
      ) : null}
      {title ? <h2 className="mb-4 text-lg font-medium text-primary">{title}</h2> : null}
      {children}
    </Surface>
  )
}
