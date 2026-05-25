export type DayGreeting = 'Good Morning' | 'Good Afternoon' | 'Good Evening';

function normalizeHour(hour: number): number {
  if (!Number.isFinite(hour)) {
    return 9;
  }

  const whole = Math.trunc(hour);
  const mod = whole % 24;
  return mod < 0 ? mod + 24 : mod;
}

export function getGreetingByHour(hour: number): DayGreeting {
  const normalizedHour = normalizeHour(hour);

  if (normalizedHour < 12) {
    return 'Good Morning';
  }

  if (normalizedHour < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
}

export function getGreetingForDate(date: Date = new Date()): DayGreeting {
  return getGreetingByHour(date.getHours());
}

export function getDisplayFirstName(name: string | null | undefined): string {
  const candidate = name?.trim();
  if (!candidate) {
    return 'there';
  }

  return candidate.split(/\s+/)[0] || 'there';
}
