import { Link } from 'react-router-dom'
import { Drawer } from '@/components/ui/Drawer'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { landingCopy } from '@/content/landingCopy'

export type LandingMobileDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

const linkClass =
  'focus-ring rounded-md px-3 py-2.5 text-sm text-secondary transition-colors duration-150 ease-out hover:bg-surface hover:text-primary'

export function LandingMobileDrawer({ isOpen, onClose }: LandingMobileDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} ariaLabel="Navigation">
      <div className="mb-6 flex h-9 items-center">
        <Link
          to="/"
          onClick={onClose}
          className="focus-ring rounded-sm font-display text-lg leading-none text-primary"
        >
          {landingCopy.nav.wordmark}
        </Link>
      </div>
      <div className="mb-4 px-3">
        <StatusIndicator tone="signal" label={landingCopy.nav.status} pulse />
      </div>
      <nav className="flex flex-col gap-1" aria-label="Account">
        <Link to="/auth/sign-in" onClick={onClose} className={linkClass}>
          {landingCopy.nav.signIn}
        </Link>
        <Link to="/auth/sign-up" onClick={onClose} className={linkClass}>
          {landingCopy.nav.signUp}
        </Link>
      </nav>
    </Drawer>
  )
}
