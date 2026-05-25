import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  DollarSign,
  Info,
  Package,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '../hooks/useApi';
import { cn } from '../lib/cn';
import { INotification, NotificationType } from '../shared/types';
import { Badge, Spinner } from './ui';

// ─── Notification icon mapping ────────────────────────────────

const NOTIFICATION_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  [NotificationType.LOW_STOCK]: {
    icon: Package,
    color: 'text-amber-600 dark:text-amber-300',
    bg: 'bg-amber-50 border border-amber-200 dark:border-amber-500/55 dark:bg-amber-500/15',
  },
  [NotificationType.INVOICE_OVERDUE]: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-rose-300',
    bg: 'bg-red-50 border border-red-200 dark:border-rose-500/55 dark:bg-rose-500/15',
  },
  [NotificationType.INVOICE_PAID]: {
    icon: DollarSign,
    color: 'text-green-600 dark:text-emerald-300',
    bg: 'bg-green-50 border border-green-200 dark:border-emerald-500/55 dark:bg-emerald-500/15',
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    icon: DollarSign,
    color: 'text-green-600 dark:text-emerald-300',
    bg: 'bg-green-50 border border-green-200 dark:border-emerald-500/55 dark:bg-emerald-500/15',
  },
  [NotificationType.NEW_CUSTOMER]: {
    icon: Users,
    color: 'text-blue-600 dark:text-sky-300',
    bg: 'bg-blue-50 border border-blue-200 dark:border-sky-500/55 dark:bg-sky-500/15',
  },
  [NotificationType.SUBSCRIPTION_EXPIRING]: {
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-300',
    bg: 'bg-orange-50 border border-orange-200 dark:border-orange-500/55 dark:bg-orange-500/15',
  },
  [NotificationType.PURCHASE_ORDER_RECEIVED]: {
    icon: Package,
    color: 'text-purple-600 dark:text-violet-300',
    bg: 'bg-purple-50 border border-purple-200 dark:border-violet-500/55 dark:bg-violet-500/15',
  },
  [NotificationType.SYSTEM]: {
    icon: Info,
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80',
  },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function NotificationItem({ notification }: { notification: INotification }) {
  const markRead = useMarkNotificationRead();
  const deleteNotif = useDeleteNotification();
  const config = NOTIFICATION_ICON[notification.type] || NOTIFICATION_ICON[NotificationType.SYSTEM];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-slate-50/85 dark:hover:bg-slate-800',
        !notification.read && 'bg-primary-50/45'
      )}
      onClick={() => !notification.read && markRead.mutate(notification._id)}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          config.bg
        )}
      >
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm',
              !notification.read
                ? 'font-semibold text-slate-900 dark:text-slate-100'
                : 'font-medium text-slate-700 dark:text-slate-300'
            )}
          >
            {notification.title}
          </p>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markRead.mutate(notification._id);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:text-slate-500 dark:hover:bg-slate-700"
                title="Mark as read"
              >
                <Check className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNotif.mutate(notification._id);
              }}
              className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-500 dark:text-slate-500 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {!notification.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadCount();
  const { data, isLoading } = useNotifications({ limit: 20 });
  const markAll = useMarkAllRead();

  const unreadCount = countData ?? 0;
  const notifications = (data?.data || []) as INotification[];

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg border border-transparent p-2 text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100/75 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/96 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
                {unreadCount > 0 && <Badge variant="info">{unreadCount} new</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-200"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-120 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="md" />
                </div>
              )}
              {!isLoading && notifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    All caught up!
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    No notifications yet.
                  </p>
                </div>
              )}
              {notifications.map((n) => (
                <NotificationItem key={n._id} notification={n} />
              ))}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
                <a
                  href="/notifications"
                  className="text-xs text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-200 font-medium"
                >
                  View all notifications →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
