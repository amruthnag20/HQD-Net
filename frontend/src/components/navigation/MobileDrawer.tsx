import { Link } from 'react-router-dom'
import { Drawer } from '@/components/ui/Drawer'
import { NavigationItem } from './NavigationItem'
import { navItems } from './navItems'

export type MobileDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} ariaLabel="Navigation">
      <div className="mb-6 flex h-9 items-center">
        <Link
          to="/"
          onClick={onClose}
          className="focus-ring rounded-sm font-display text-lg leading-none text-primary"
        >
          HQD-Net
        </Link>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Primary">
        {navItems.map((item) => (
          <NavigationItem key={item.to} {...item} collapsed={false} onNavigate={onClose} />
        ))}
      </nav>
    </Drawer>
  )
}
