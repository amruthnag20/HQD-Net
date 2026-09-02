import { Menu } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { NotificationButton } from './NotificationButton'
import { ProfileButton } from './ProfileButton'

export type HeaderProps = {
  onOpenMobileNav: () => void
}

/** Shared by Home/History/Settings — quiet, no title bar or breadcrumb clutter. */
export function Header({ onOpenMobileNav }: HeaderProps) {
  return (
    <header className="z-header flex h-[60px] shrink-0 items-center justify-between border-b border-line bg-canvas px-4 md:px-6">
      <IconButton
        icon={<Menu className="size-[18px]" strokeWidth={1.5} />}
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="md:hidden"
      />
      <span className="hidden md:block" />
      <div className="flex items-center gap-2">
        <NotificationButton />
        <ProfileButton />
      </div>
    </header>
  )
}
