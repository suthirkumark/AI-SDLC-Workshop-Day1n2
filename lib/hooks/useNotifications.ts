'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

const POLL_INTERVAL_MS = 30_000;

export interface DueReminder {
  id: number;
  title: string;
  due_date: string | null;
  priority: string;
  reminder_minutes: number | null;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

// The browser's permission state is external to React, so it is read through a
// store rather than mirrored into state inside an effect. Nothing but our own
// permission prompt can change it mid-session, so `notify` is called there.
let listeners: (() => void)[] = [];

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function getSnapshot(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** The server can't know the real permission; React re-reads after hydration. */
function getServerSnapshot(): NotificationPermissionState {
  return 'default';
}

/**
 * Polls `/api/notifications/check` every 30 seconds and raises a browser
 * notification for each due reminder, then acknowledges them server-side so
 * the same reminder window never fires twice.
 */
export function useNotifications(enabled: boolean = true) {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Guards against a slow poll overlapping the next tick.
  const pollingRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported' as const;
    }
    const result = await Notification.requestPermission();
    notify();
    return result;
  }, []);

  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        const res = await fetch('/api/notifications/check');
        if (!res.ok) return;

        const { notifications } = (await res.json()) as { notifications: DueReminder[] };
        if (!notifications?.length) return;

        for (const reminder of notifications) {
          new Notification(reminder.title, {
            body: reminder.due_date ? `Due ${reminder.due_date.replace('T', ' ')}` : 'Due soon',
            tag: `todo-${reminder.id}`,
          });
        }

        await fetch('/api/notifications/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todo_ids: notifications.map((n) => n.id) }),
        });
      } catch {
        // A failed poll is not actionable — the next tick retries.
      } finally {
        pollingRef.current = false;
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, permission]);

  return { permission, requestPermission };
}

export default useNotifications;
