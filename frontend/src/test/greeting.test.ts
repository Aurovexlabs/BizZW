import { describe, expect, it } from 'vitest';
import { getDisplayFirstName, getGreetingByHour, getGreetingForDate } from '../lib/greeting';

describe('greeting utilities', () => {
  it('maps hour boundaries to the correct greeting', () => {
    expect(getGreetingByHour(0)).toBe('Good Morning');
    expect(getGreetingByHour(11)).toBe('Good Morning');
    expect(getGreetingByHour(12)).toBe('Good Afternoon');
    expect(getGreetingByHour(16)).toBe('Good Afternoon');
    expect(getGreetingByHour(17)).toBe('Good Evening');
    expect(getGreetingByHour(23)).toBe('Good Evening');
  });

  it('normalizes out-of-range or invalid hours safely', () => {
    expect(getGreetingByHour(24)).toBe('Good Morning');
    expect(getGreetingByHour(-1)).toBe('Good Evening');
    expect(getGreetingByHour(Number.NaN)).toBe('Good Morning');
  });

  it('derives greeting and display name robustly', () => {
    const afternoon = new Date('2026-04-11T13:45:00Z');
    expect(getGreetingForDate(afternoon)).toBe('Good Afternoon');

    expect(getDisplayFirstName('Tatenda Moyo')).toBe('Tatenda');
    expect(getDisplayFirstName('  Chipo   Nyathi  ')).toBe('Chipo');
    expect(getDisplayFirstName('')).toBe('there');
    expect(getDisplayFirstName(undefined)).toBe('there');
  });
});
