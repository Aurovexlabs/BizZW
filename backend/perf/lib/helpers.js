import { check, fail } from 'k6';
import http from 'k6/http';

export function getBaseUrl() {
  return (__ENV.BIZZW_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
}

export function buildAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function parseJsonSafely(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function requireEnv(name) {
  const value = __ENV[name];
  if (!value) {
    fail(`Missing required env var: ${name}`);
  }

  return value;
}

function loginWithEmailPassword(baseUrl, email, password) {
  const response = http.post(`${baseUrl}/api/v1/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth_login' },
  });

  const ok = check(response, {
    'login status is 200': (res) => res.status === 200,
  });

  if (!ok) {
    fail(`Login failed with status ${response.status}. Body: ${response.body}`);
  }

  const body = parseJsonSafely(response);
  const token = body && body.data && body.data.accessToken;
  if (!token) {
    fail('Login response did not include data.accessToken');
  }

  return token;
}

export function resolveAccessToken(baseUrl) {
  const directToken = __ENV.BIZZW_LOAD_ACCESS_TOKEN;
  if (directToken && directToken.trim()) {
    return directToken.trim();
  }

  const email = requireEnv('BIZZW_LOAD_EMAIL');
  const password = requireEnv('BIZZW_LOAD_PASSWORD');

  return loginWithEmailPassword(baseUrl, email, password);
}

export function getAuthContext() {
  const baseUrl = getBaseUrl();
  const token = resolveAccessToken(baseUrl);

  return {
    baseUrl,
    token,
    headers: buildAuthHeaders(token),
  };
}

export function ensureProductId(baseUrl, headers) {
  const providedProductId = __ENV.BIZZW_LOAD_PRODUCT_ID;
  if (providedProductId && providedProductId.trim()) {
    return providedProductId.trim();
  }

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const response = http.post(
    `${baseUrl}/api/v1/inventory`,
    JSON.stringify({
      name: `Load Product ${suffix}`,
      sku: `LOAD-${suffix}`,
      category: 'Load Test',
      costPrice: 8,
      sellPrice: 15,
      quantity: 500,
      lowStockThreshold: 25,
    }),
    {
      headers,
      tags: { endpoint: 'inventory_create_seed' },
    }
  );

  const ok = check(response, {
    'seed product status is 201': (res) => res.status === 201,
  });

  if (!ok) {
    fail(`Failed to create seed product. Status ${response.status}. Body: ${response.body}`);
  }

  const body = parseJsonSafely(response);
  const productId = body && body.data && body.data._id;
  if (!productId) {
    fail('Seed product response did not include data._id');
  }

  return productId;
}

export function dateRange(daysBack) {
  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const toDate = (value) => value.toISOString().split('T')[0];
  return {
    startDate: toDate(start),
    endDate: toDate(now),
  };
}

export function readSystemStatus(baseUrl, headers) {
  return http.get(`${baseUrl}/api/v1/system/status`, {
    headers,
    tags: { endpoint: 'system_status' },
  });
}
