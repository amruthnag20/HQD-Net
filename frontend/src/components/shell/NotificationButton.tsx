import { useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { NotificationPopover } from './NotificationPopover'
import { mockNotifications } from '@/features/notifications/mockNotifications'

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasUnread = mockNotifications.some((notification) => !notification.read)

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        icon={<Bell className="size-[18px]" strokeWidth={1.5} />}
        aria-label={hasUnread ? 'Notifications, unread items' : 'Notifications'}
        active={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      />
      {hasUnread && !isOpen ? (
        <span
          className="pointer-events-none absolute right-2 top-2 size-1.5 rounded-full bg-accent"
          aria-hidden="true"
        />
      ) : null}
      <NotificationPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        containerRef={containerRef}
      />
    </div>
  )
}
