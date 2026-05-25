import { useState, useCallback } from 'react';

/**
 * Type-safe localStorage hook with JSON serialization.
 * Falls back to defaultValue if the key doesn't exist or JSON parse fails.
 *
 * @example
 * const [filters, setFilters] = useLocalStorage('inventory-filters', { category: '' });
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (err) {
        console.warn(`[useLocalStorage] Could not set "${key}":`, err);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (err) {
      console.warn(`[useLocalStorage] Could not remove "${key}":`, err);
    }
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
}
