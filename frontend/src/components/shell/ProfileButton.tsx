import { useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { ProfilePopover } from './ProfilePopover'
import { mockProfile } from '@/features/profile/mockProfile'
import { cn } from '@/lib/utils/cn'

export function ProfileButton() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Open profile menu"
        className={cn(
          'focus-ring flex items-center rounded-full transition-colors duration-150 ease-out',
          isOpen && 'ring-2 ring-accent-muted',
        )}
      >
        <Avatar name={mockProfile.name} size="md" />
      </button>
      <ProfilePopover isOpen={isOpen} onClose={() => setIsOpen(false)} containerRef={containerRef} />
    </div>
  )
}
