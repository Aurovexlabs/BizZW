import { useCallback, useSyncExternalStore } from 'react';
import {
    getOfflineQueueSnapshot,
    removeOfflineQueueItem,
    retryOfflineQueueItemNow,
    setOfflineQueuePaused,
    subscribeOfflineQueue,
    updateOfflineQueuePolicy,
} from '../lib/offlineQueue';

export function useOfflineQueueStatus() {
  const snapshot = useSyncExternalStore(
    subscribeOfflineQueue,
    getOfflineQueueSnapshot,
    getOfflineQueueSnapshot
  );

  const pause = useCallback(() => {
    setOfflineQueuePaused(true);
  }, []);

  const resume = useCallback(() => {
    setOfflineQueuePaused(false);
  }, []);

  const retryNow = useCallback((id: string) => {
    retryOfflineQueueItemNow(id);
  }, []);

  const removeItem = useCallback((id: string) => {
    removeOfflineQueueItem(id);
  }, []);

  const setPolicy = useCallback((input: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number }) => {
    updateOfflineQueuePolicy(input);
  }, []);

  return {
    ...snapshot,
    pause,
    resume,
    retryNow,
    removeItem,
    setPolicy,
  };
}
