# BizZW Backend API 🇿🇼

Enterprise Business Management REST API for Zimbabwean SMEs.

## Tech Stack

- **Runtime:** Node.js 22 LTS
- **Framework:** Express.js + TypeScript (strict)
- **Database:** MongoDB Atlas + Mongoose (multi-tenant)
- **Auth:** JWT + Refresh Tokens (httpOnly cookies)
- **Payments:** Paynow Zimbabwe (EcoCash, VISA, bank)
- **Media:** ImageKit.io
- **Email:** Resend
- **AI:** Google Gemini 1.5 Flash (SSE streaming)
- **Security:** Arcjet (WAF, bot protection, adaptive rate limiting)
- **Observability:** Pino structured logging + Sentry error monitoring
- **Testing:** Vitest + Supertest

## Project Structure

```
bizzw-backend/
├── src/
│   ├── shared/
│   │   ├── types.ts          # All TypeScript interfaces & enums
│   │   └── utils.ts          # Currency, date, formatting helpers
│   ├── modules/
│   │   ├── auth/             # Registration, login, JWT, invites
│   │   ├── inventory/        # Products, stock, CSV import/export
│   │   ├── invoices/         # Invoice lifecycle + Paynow + email
│   │   ├── sales/            # POS checkout, receipts
│   │   ├── customers/        # Customer profiles + history
│   │   ├── expenses/         # Expense tracking + summaries
│   │   ├── reports/          # Revenue, P&L, analytics
│   │   ├── ai/               # Gemini SSE: forecast, restock, insights
│   │   ├── media/            # ImageKit auth + file deletion
│   │   └── subscriptions/    # Plan management + Paynow upgrades
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verify + RBAC
│   │   ├── arcjet.middleware.ts   # Arcjet request protection
│   │   ├── error.middleware.ts    # Global error handler + AppError
│   │   └── rateLimiter.middleware.ts
│   ├── lib/
│   │   ├── db.ts             # MongoDB multi-tenant connection manager
│   │   ├── imagekit.ts       # ImageKit server-side client
│   │   ├── logger.ts         # Pino logger + request IDs
│   │   ├── resend.ts         # Transactional email + templates
│   │   └── sentry.ts         # Sentry bootstrap + capture helper
│   ├── utils/
│   │   ├── csv.ts            # CSV builder for exports
│   │   ├── paynow.ts         # Webhook signature verification
│   │   └── validation.ts     # Zod helpers + file validation
│   ├── test/                 # Vitest test suites
│   ├── app.ts                # Express app setup
│   └── server.ts             # Entry point
├── .env.example
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 22+
- npm 10+
- MongoDB Atlas account (free tier: 512MB)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

| Variable                    | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `MONGODB_URI`               | MongoDB Atlas connection string                    |
| `JWT_ACCESS_SECRET`         | Random 32+ char string                             |
| `JWT_REFRESH_SECRET`        | Different random 32+ char string                   |
| `API_RATE_LIMIT_WINDOW_MS`  | Global API limiter window in ms (default `900000`) |
| `API_RATE_LIMIT_MAX`        | Global API limiter max requests per window         |
| `IMAGEKIT_PUBLIC_KEY`       | From ImageKit.io dashboard                         |
| `IMAGEKIT_PRIVATE_KEY`      | From ImageKit.io dashboard                         |
| `IMAGEKIT_URL_ENDPOINT`     | e.g. `https://ik.imagekit.io/yourID`               |
| `RESEND_API_KEY`            | From resend.com dashboard                          |
| `RESEND_FROM`               | Sender identity (e.g. `BizZW <noreply@bizzw.dev>`) |
| `EMAIL_PROVIDER_PRIMARY`    | `resend` or `smtp` provider priority               |
| `SMTP_HOST`                 | SMTP fallback host (optional)                      |
| `SMTP_PORT`                 | SMTP fallback port                                 |
| `SMTP_SECURE`               | `true` for SMTPS/465, else `false`                 |
| `SMTP_USER`                 | SMTP fallback username                             |
| `SMTP_PASS`                 | SMTP fallback password                             |
| `SMTP_FROM`                 | Optional SMTP sender identity                      |
| `PAYNOW_INTEGRATION_ID`     | From Paynow merchant account                       |
| `PAYNOW_INTEGRATION_KEY`    | From Paynow merchant account                       |
| `PUBLIC_API_BASE_URL`       | Public backend URL for Paynow result callback      |
| `GEMINI_API_KEY`            | From Google AI Studio                              |
| `CLIENT_URL`                | Frontend URL (e.g. `http://localhost:5173`)        |
| `ARCJET_KEY`                | Arcjet site key for WAF and bot protection         |
| `SENTRY_DSN`                | Sentry DSN for backend error monitoring            |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry tracing sample rate (`0`-`1`)               |
| `SENTRY_RELEASE`            | Optional release identifier                        |
| `LOG_LEVEL`                 | Pino log level (e.g. `info`, `debug`)              |

### 3. Run in development

```bash
npm run dev
```

API will be available at `http://localhost:5000`

### 4. Build for production

```bash
npm run build
npm start
```

## API Endpoints

| Module        | Base Path                                              |
| ------------- | ------------------------------------------------------ |
| Auth          | `POST /api/v1/auth/register` `POST /api/v1/auth/login` |
| Inventory     | `GET/POST /api/v1/inventory`                           |
| Invoices      | `GET/POST /api/v1/invoices`                            |
| Sales / POS   | `GET/POST /api/v1/sales`                               |
| Customers     | `GET/POST /api/v1/customers`                           |
| Expenses      | `GET/POST /api/v1/expenses`                            |
| Reports       | `GET /api/v1/reports/dashboard`                        |
| AI            | `POST /api/v1/ai/forecast` (SSE)                       |
| Subscriptions | `GET/POST /api/v1/subscriptions`                       |
| Media         | `GET /api/v1/media/auth`                               |

Full API response format:

```json
{ "success": true, "data": {}, "message": "string", "meta": { "total": 0, "page": 1 } }
```

## Testing

```bash
# Run default test suite (fast path; Mongo-dependent integration suites are skipped)
npm test

# Run full integration suite with Mongo enabled
RUN_MONGO_TESTS=1 MONGODB_URI=mongodb://127.0.0.1:27017/bizZW_test npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

Set `RUN_MONGO_TESTS=1` to enable Mongo-backed integration suites in local runs and CI.

## Performance Testing (k6)

Install [k6](https://k6.io/docs/get-started/installation/) locally, then run load tests against a running backend API.

Environment variables used by performance scripts:

| Variable                  | Required    | Description                                                          |
| ------------------------- | ----------- | -------------------------------------------------------------------- |
| `BIZZW_BASE_URL`          | No          | API base URL (default `http://127.0.0.1:5000`)                       |
| `BIZZW_LOAD_ACCESS_TOKEN` | Conditional | Access token used for load traffic                                   |
| `BIZZW_LOAD_EMAIL`        | Conditional | Login email if token not provided                                    |
| `BIZZW_LOAD_PASSWORD`     | Conditional | Login password if token not provided                                 |
| `BIZZW_LOAD_PRODUCT_ID`   | No          | Existing product for write scenarios; if omitted, script creates one |
| `K6_DURATION`             | No          | Scenario duration (default `2m`)                                     |

Run report cache read load:

```bash
BIZZW_BASE_URL=http://127.0.0.1:5000 \
BIZZW_LOAD_ACCESS_TOKEN=<ACCESS_TOKEN> \
npm run perf:reports-cache
```

Run mixed read/write invalidation load:

```bash
BIZZW_BASE_URL=http://127.0.0.1:5000 \
BIZZW_LOAD_ACCESS_TOKEN=<ACCESS_TOKEN> \
K6_READ_RPS=25 K6_WRITE_RPS=3 \
npm run perf:reports-invalidation
```

Each script prints a post-run cache summary from `/api/v1/system/status` to help verify hit rate and fallback behavior.

## RBAC Roles

| Role         | Access                               |
| ------------ | ------------------------------------ |
| `ORG_OWNER`  | Full access                          |
| `ORG_ADMIN`  | Inventory, sales, customers, reports |
| `CASHIER`    | POS sales only                       |
| `ACCOUNTANT` | Invoices, expenses, reports          |
| `VIEWER`     | Read-only                            |

## Free Hosting (Render.com)

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add all environment variables from `.env.example`
6. For your production domain, set these values:
   - `CLIENT_URL=https://bizzw.dev`
   - `PUBLIC_API_BASE_URL=https://api.bizzw.dev`
   - `RESEND_FROM=BizZW <noreply@bizzw.dev>`
