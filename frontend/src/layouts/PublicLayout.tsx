import { PageTransition } from '@/components/motion/PageTransition'

/** Bare wrapper for "/" — no sidebar/header chrome. */
export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <PageTransition />
    </div>
  )
}
