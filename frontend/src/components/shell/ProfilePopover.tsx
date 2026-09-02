import type { RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings as SettingsIcon, User } from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { Divider } from '@/components/ui/Divider'
import { mockProfile } from '@/features/profile/mockProfile'
import { useSession } from '@/features/auth/useSession'
import { cn } from '@/lib/utils/cn'

export type ProfilePopoverProps = {
  isOpen: boolean
  onClose: () => void
  containerRef: RefObject<HTMLElement | null>
}

const menuItemClass =
  'focus-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left font-mono text-xs uppercase tracking-wider text-secondary transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-primary'

export function ProfilePopover({ isOpen, onClose, containerRef }: ProfilePopoverProps) {
  const navigate = useNavigate()
  const { signOut } = useSession()

  const goToProfile = () => {
    onClose()
    navigate('/app/settings#profile')
    // Trigger hashchange event in case we are already on settings
    window.location.hash = '#profile'
  }

  const goToSettings = () => {
    onClose()
    navigate('/app/settings')
  }

  const handleSignOut = () => {
    onClose()
    signOut()
    navigate('/auth/sign-in')
  }

  return (
    <Popover isOpen={isOpen} onClose={onClose} containerRef={containerRef} ariaLabel="Profile" width={260}>
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="size-7 rounded-full bg-surface-elevated border border-line flex items-center justify-center font-display text-xs text-primary uppercase">
            {mockProfile.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono uppercase tracking-wider text-primary font-semibold truncate">{mockProfile.name}</p>
            <p className="text-[10px] font-sans text-muted truncate">{mockProfile.role}</p>
          </div>
        </div>
        <p className="font-mono text-[9px] text-muted tracking-widest uppercase truncate border-t border-line-subtle pt-1.5 mt-1.5">
          {mockProfile.workspace}
        </p>
      </div>
      <Divider className="my-1.5" />
      <div className="flex flex-col gap-0.5">
        <button type="button" className={menuItemClass} onClick={goToProfile}>
          <User className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          Profile & Workspace
        </button>
        <button type="button" className={menuItemClass} onClick={goToSettings}>
          <SettingsIcon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          Settings
        </button>
        <Divider className="my-1" />
        <button type="button" className={cn(menuItemClass, 'hover:text-danger text-danger/80')} onClick={handleSignOut}>
          <LogOut className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </Popover>
  )
}
