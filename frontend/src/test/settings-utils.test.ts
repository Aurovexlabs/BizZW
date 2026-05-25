import { describe, expect, it } from 'vitest';
import {
  getTeamLimitAwareErrorMessage,
  hasAnyUsageLimitReached,
  isTeamUserLimitError,
} from '../lib/settings-utils';

describe('settings utility helpers', () => {
  it('maps team seat-limit errors to upgrade guidance', () => {
    const error = {
      response: {
        data: {
          errorCode: 'USER_LIMIT_REACHED',
          message: 'Seat cap reached.',
        },
      },
    };

    expect(getTeamLimitAwareErrorMessage(error, 'Fallback')).toBe(
      'Seat cap reached. Upgrade your plan in Billing to add more seats.'
    );
    expect(isTeamUserLimitError(error)).toBe(true);
  });

  it('falls back gracefully for generic errors', () => {
    const genericError = { response: { data: { message: 'Something went wrong' } } };
    const emptyError = {};

    expect(getTeamLimitAwareErrorMessage(genericError, 'Fallback')).toBe('Something went wrong');
    expect(getTeamLimitAwareErrorMessage(emptyError, 'Fallback')).toBe('Fallback');
    expect(isTeamUserLimitError(genericError)).toBe(false);
  });

  it('detects usage-limit saturation reliably', () => {
    const atLimit = {
      usage: {
        users: { current: 2, limit: 2, isAtLimit: true },
        products: { current: 10, limit: 50, isAtLimit: false },
        branches: { current: 1, limit: 2, isAtLimit: false },
      },
    };

    const withinLimits = {
      usage: {
        users: { current: 1, limit: 2, isAtLimit: false },
        products: { current: 10, limit: 50, isAtLimit: false },
        branches: { current: 1, limit: 2, isAtLimit: false },
      },
    };

    expect(hasAnyUsageLimitReached(atLimit)).toBe(true);
    expect(hasAnyUsageLimitReached(withinLimits)).toBe(false);
    expect(hasAnyUsageLimitReached(undefined)).toBe(false);
  });
});
