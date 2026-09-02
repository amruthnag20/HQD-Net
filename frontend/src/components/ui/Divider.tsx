import { cn } from '@/lib/utils/cn'

export type DividerProps = {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'border-line',
        orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l',
        className,
      )}
    />
  )
}
