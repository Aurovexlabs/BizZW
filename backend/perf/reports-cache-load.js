import { check } from 'k6';
import http from 'k6/http';
import { dateRange, getAuthContext, readSystemStatus } from './lib/helpers.js';

function readNumberEnv(name, fallback) {
  const raw = __ENV[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const duration = __ENV.K6_DURATION || '2m';
const preAllocatedVUs = readNumberEnv('K6_PREALLOCATED_VUS', 30);
const maxVUs = readNumberEnv('K6_MAX_VUS', 120);

export const options = {
  discardResponseBodies: true,
  scenarios: {
    dashboard_reads: {
      executor: 'constant-arrival-rate',
      rate: readNumberEnv('K6_DASHBOARD_RPS', 20),
      timeUnit: '1s',
      duration,
      preAllocatedVUs,
      maxVUs,
      exec: 'dashboardReads',
    },
    revenue_reads: {
      executor: 'constant-arrival-rate',
      rate: readNumberEnv('K6_REVENUE_RPS', 20),
      timeUnit: '1s',
      duration,
      preAllocatedVUs,
      maxVUs,
      exec: 'revenueReads',
    },
    top_products_reads: {
      executor: 'constant-arrival-rate',
      rate: readNumberEnv('K6_TOP_PRODUCTS_RPS', 12),
      timeUnit: '1s',
      duration,
      preAllocatedVUs,
      maxVUs,
      exec: 'topProductsReads',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:reports_dashboard}': ['p(95)<400'],
    'http_req_duration{endpoint:reports_revenue}': ['p(95)<450'],
    'http_req_duration{endpoint:reports_top_products}': ['p(95)<500'],
  },
};

export function setup() {
  const auth = getAuthContext();
  const range = dateRange(readNumberEnv('K6_REPORT_DAYS_BACK', 30));

  return {
    baseUrl: auth.baseUrl,
    headers: auth.headers,
    range,
  };
}

export function dashboardReads(data) {
  const response = http.get(`${data.baseUrl}/api/v1/reports/dashboard`, {
    headers: data.headers,
    tags: { endpoint: 'reports_dashboard' },
  });

  check(response, {
    'dashboard status is 200': (res) => res.status === 200,
  });
}

export function revenueReads(data) {
  const query = `startDate=${data.range.startDate}&endDate=${data.range.endDate}`;
  const response = http.get(`${data.baseUrl}/api/v1/reports/revenue?${query}`, {
    headers: data.headers,
    tags: { endpoint: 'reports_revenue' },
  });

  check(response, {
    'revenue status is 200': (res) => res.status === 200,
  });
}

export function topProductsReads(data) {
  const query = `startDate=${data.range.startDate}&endDate=${data.range.endDate}&limit=20`;
  const response = http.get(`${data.baseUrl}/api/v1/reports/top-products?${query}`, {
    headers: data.headers,
    tags: { endpoint: 'reports_top_products' },
  });

  check(response, {
    'top products status is 200': (res) => res.status === 200,
  });
}

export function teardown(data) {
  const response = readSystemStatus(data.baseUrl, data.headers);
  if (response.status === 200) {
    const cacheMode = response.json('data.cache.mode');
    const cacheHitRate = response.json('data.cache.stats.hitRate');
    const cacheFallback = response.json('data.cache.fallbackInUse');
    console.log(
      `System cache summary: mode=${cacheMode} hitRate=${cacheHitRate} fallbackInUse=${cacheFallback}`
    );
  }
}
