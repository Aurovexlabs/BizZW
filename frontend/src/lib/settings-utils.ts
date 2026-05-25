type TeamLimitErrorShape = {
  response?: {
    data?: {
      message?: string;
      errorCode?: string;
    };
  };
};

type UsageMetric = {
  current: number;
  limit: number;
  isAtLimit: boolean;
};

export type UsageLimitsLike = {
  usage: {
    users: UsageMetric;
    products: UsageMetric;
    branches: UsageMetric;
  };
};

export function getTeamLimitAwareErrorMessage(err: unknown, fallback: string): string {
  const e = err as TeamLimitErrorShape;
  const errorCode = e?.response?.data?.errorCode;
  const message = e?.response?.data?.message;

  if (errorCode === 'USER_LIMIT_REACHED') {
    return `${message || 'User limit reached for your current plan.'} Upgrade your plan in Billing to add more seats.`;
  }

  return message || fallback;
}

export function isTeamUserLimitError(err: unknown): boolean {
  const e = err as TeamLimitErrorShape;
  return e?.response?.data?.errorCode === 'USER_LIMIT_REACHED';
}

export function hasAnyUsageLimitReached(usageData?: UsageLimitsLike): boolean {
  if (!usageData) {
    return false;
  }

  return [usageData.usage.users, usageData.usage.products, usageData.usage.branches].some(
    (entry) => entry.isAtLimit
  );
}
