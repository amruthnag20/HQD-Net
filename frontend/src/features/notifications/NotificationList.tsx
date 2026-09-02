import { mockNotifications } from './mockNotifications'
import { BellOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function NotificationList() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-subtle mb-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">SYSTEM NOTIFICATIONS</p>
        <span className="font-mono text-[9px] text-accent tracking-wider uppercase">
          {mockNotifications.filter(n => !n.read).length} NEW
        </span>
      </div>

      {mockNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <BellOff className="size-5 text-muted mb-2" strokeWidth={1.5} />
          <p className="font-mono text-xs text-secondary uppercase tracking-wider">No New Notifications</p>
          <p className="font-sans text-[11px] text-muted mt-0.5">System activity telemetry will appear here.</p>
        </div>
      ) : (
        <ul className="flex flex-col max-h-[320px] overflow-y-auto divide-y divide-line-subtle/50">
          {mockNotifications.map((notification) => (
            <li key={notification.id}>
              <div className="flex items-start gap-2.5 rounded px-2.5 py-2.5 hover:bg-surface-subtle transition-colors cursor-default">
                <span
                  className={cn(
                    'mt-1 size-1.5 shrink-0 rounded-full',
                    notification.read ? 'bg-transparent border border-muted/50' : 'bg-accent shadow-[0_0_6px_var(--color-accent)]',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs uppercase tracking-wider text-primary font-medium">{notification.title}</p>
                  <p className="truncate font-sans text-xs text-secondary mt-0.5">{notification.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted tracking-wider">
                  {notification.timestamp}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
