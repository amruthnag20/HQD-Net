import type { RefObject } from 'react'
import { Popover } from '@/components/ui/Popover'
import { NotificationList } from '@/features/notifications/NotificationList'

export type NotificationPopoverProps = {
  isOpen: boolean
  onClose: () => void
  containerRef: RefObject<HTMLElement | null>
}

export function NotificationPopover({ isOpen, onClose, containerRef }: NotificationPopoverProps) {
  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      containerRef={containerRef}
      ariaLabel="Notifications"
      width={340}
    >
      <NotificationList />
    </Popover>
  )
}
