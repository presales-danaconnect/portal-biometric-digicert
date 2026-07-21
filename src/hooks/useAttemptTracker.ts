import { useState, useCallback } from 'react';

/**
 * Tracks verification attempts per tenant+service combo using
 * sessionStorage, so the count survives a page reload within the same
 * browser tab (unlike plain component state) — this is intentional:
 * the goal is to prevent a user from bypassing the attempt limit by
 * simply refreshing the page.
 *
 * The counter is NOT reset automatically; it only clears when the
 * browser tab/session ends (sessionStorage's natural lifetime).
 */
export function useAttemptTracker(tenant: string, service: string, maxAttempts: number) {
  const storageKey = `verification-attempts:${tenant}:${service}`;

  const getStoredAttempts = (): number => {
    try {
      const value = sessionStorage.getItem(storageKey);
      return value ? parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  };

  const [attemptsUsed, setAttemptsUsed] = useState<number>(getStoredAttempts);

  const recordAttempt = useCallback(() => {
    const next = getStoredAttempts() + 1;
    try {
      sessionStorage.setItem(storageKey, String(next));
    } catch {
      // sessionStorage unavailable (e.g. private browsing edge cases) —
      // fall back to in-memory count only for this render.
    }
    setAttemptsUsed(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const hasReachedLimit = maxAttempts > 0 && attemptsUsed >= maxAttempts;
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

  return { attemptsUsed, attemptsRemaining, hasReachedLimit, recordAttempt };
}
