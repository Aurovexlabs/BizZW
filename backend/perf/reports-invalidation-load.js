import { check } from 'k6';
import http from 'k6/http';
import {
  buildAuthHeaders,
  dateRange,
  ensureProductId,
  getAuthContext,
  readSystemStatus,
} from './lib/helpers.js';

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
const preAllocatedVUs = readNumberEnv('K6_PREALLOCATED_VUS', 40);
const maxVUs = readNumberEnv('K6_MAX_VUS', 160);

export const options = {
  discardResponseBodies: true,
  scenarios: {
    report_readers: {
      executor: 'constant-arrival-rate',
      rate: readNumberEnv('K6_READ_RPS', 20),
      timeUnit: '1s',
      duration,
      preAllocatedVUs,
      maxVUs,
      exec: 'reportReaders',
    },
    transaction_writers: {
      executor: 'constant-arrival-rate',
      rate: readNumberEnv('K6_WRITE_RPS', 2),
      timeUnit: '1s',
      duration,
      preAllocatedVUs,
      maxVUs,
      exec: 'transactionWriters',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:reports_dashboard}': ['p(95)<450'],
    'http_req_duration{endpoint:reports_top_products}': ['p(95)<550'],
    'http_req_duration{endpoint:sales_write}': ['p(95)<700'],
  },
};

export function setup() {
  const auth = getAuthContext();
  const headers = auth.headers;
  const productId = ensureProductId(auth.baseUrl, headers);
  const range = dateRange(readNumberEnv('K6_REPORT_DAYS_BACK', 30));

  return {
    baseUrl: auth.baseUrl,
    token: auth.token,
    productId,
    range,
  };
}

export function reportReaders(data) {
  const headers = buildAuthHeaders(data.token);

  const dashboardRes = http.get(`${data.baseUrl}/api/v1/reports/dashboard`, {
    headers,
    tags: { endpoint: 'reports_dashboard' },
  });
  check(dashboardRes, {
    'dashboard status is 200': (res) => res.status === 200,
  });

  const topProductsQuery = `startDate=${data.range.startDate}&endDate=${data.range.endDate}&limit=25`;
  const topProductsRes = http.get(
    `${data.baseUrl}/api/v1/reports/top-products?${topProductsQuery}`,
    {
      headers,
      tags: { endpoint: 'reports_top_products' },
    }
  );
  check(topProductsRes, {
    'top-products status is 200': (res) => res.status === 200,
  });
}

export function transactionWriters(data) {
  const headers = buildAuthHeaders(data.token);
  const quantity = Math.max(1, Math.floor(Math.random() * 2) + 1);
  const amountPaid = quantity * 15;

  const writeRes = http.post(
    `${data.baseUrl}/api/v1/sales`,
    JSON.stringify({
      items: [{ productId: data.productId, quantity }],
      discount: 0,
      currency: 'USD',
      paymentMethod: 'CASH',
      amountPaid,
    }),
    {
      headers,
      tags: { endpoint: 'sales_write' },
    }
  );

  check(writeRes, {
    'sales write status is 201': (res) => res.status === 201,
  });
}

export function teardown(data) {
  const headers = buildAuthHeaders(data.token);
  const response = readSystemStatus(data.baseUrl, headers);

  if (response.status === 200) {
    const cacheMode = response.json('data.cache.mode');
    const cacheHitRate = response.json('data.cache.stats.hitRate');
    const cacheWrites = response.json('data.cache.stats.writes');
    console.log(
      `Post-run cache summary: mode=${cacheMode} hitRate=${cacheHitRate} writes=${cacheWrites}`
    );
  }
}
