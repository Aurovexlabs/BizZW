import { useState, useEffect } from 'react';

/**
 * Delays updating a value until after the specified delay.
 * Use with search inputs to avoid firing an API call on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchInput, 350);
 * const { data } = useProducts({ search: debouncedSearch });
 */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Debounced callback — fires at most once per delay period.
 * Useful for form autosave or analytics events.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delayMs: number = 350
): T {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    const newTimer = setTimeout(() => callback(...args), delayMs);
    setTimer(newTimer);
  }) as T;
}
