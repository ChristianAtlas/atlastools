import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  className?: string;
}

const typeDot: Record<string, string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-destructive',
  success: 'bg-success',
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClick,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-md border bg-card transition-colors',
          'hover:bg-accent active:scale-[0.97]',
          open && 'bg-accent'
        )}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-card shadow-lg animate-in-up" style={{ animationDuration: '200ms' }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && onMarkAllRead && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={onMarkAllRead}>
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors cursor-pointer hover:bg-muted/30',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => {
                    onMarkRead?.(n.id);
                    onClick?.(n);
                  }}
                >
                  {/* Type dot */}
                  <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', typeDot[n.type])} />

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', !n.read && 'font-medium')}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">{timeAgo(n.timestamp)}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && onMarkRead && (
                      <button
                        onClick={e => { e.stopPropagation(); onMarkRead(n.id); }}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Mark read"
                      >
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
