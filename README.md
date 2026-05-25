# BizZW 🇿🇼

Enterprise Business Management Platform for Zimbabwean SMEs.

BizZW is a full-stack business operations platform for inventory-led and service-led teams. It combines customer management, sales and POS, invoicing, reporting, and AI-assisted operations in a single system designed for multi-tenant use, operational visibility, and cloud deployment.

## Platform At A Glance

BizZW helps teams run day-to-day operations from one place instead of stitching together spreadsheets, messaging apps, and disconnected tools. The platform covers:

- Inventory and product management with branch-aware stock tracking
- Sales and point-of-sale workflows with receipts and payment support
- Invoice creation, sending, tracking, and payment follow-up
- Customer records with balance and history visibility
- Expense tracking and operational summaries
- Executive dashboards and reporting for revenue, margins, and performance
- AI-assisted recommendations for restocking, trend analysis, and anomaly review
- Authentication, tenant, and role-based operational controls

### Who it is for

- Retail and wholesale businesses
- Service businesses with recurring customer relationships
- Multi-branch teams that need a shared source of truth
- Growing SMEs that want a path toward enterprise-grade operations

## Core Capabilities

### Operational workflows

BizZW is organized around the core work a business performs every day:

1. Create products, manage stock, and track inventory across branches.
2. Record sales and generate receipts through the POS flow.
3. Issue invoices and monitor payment status through the invoice lifecycle.
4. Maintain customer profiles, balances, and communication history.
5. Capture expenses and review financial summaries.
6. Analyze performance through dashboards, reports, and AI guidance.

### Architecture and reliability

- Multi-tenant backend with tenant-aware request handling
- REST API built with Node.js, Express, and TypeScript
- MongoDB Atlas persistence with Mongoose models
- Redis-backed caching, idempotency, and queue support where needed
- Background jobs and operational telemetry for long-running tasks
- Server-side validation, rate limiting, and error handling

### Security and communications

- JWT-based authentication and role-aware access control
- Secure contact and notification workflows
- ImageKit for media storage and delivery
- Resend for transactional email delivery
- Paynow integration for Zimbabwe-specific payment workflows
- Sentry and structured logging for production observability

### Frontend experience

- React 19 SPA with TanStack Router
- TanStack Query for server state
- Tailwind CSS v4 for design tokens and consistent styling
- Dashboard UI for operations, reporting, and settings
- Responsive marketing pages and authenticated workspace layouts

## Key Modules

The platform is split into reusable domains across the backend and frontend:

- Auth: registration, login, invites, tokens, and profile management
- Inventory: products, stock, CSV import/export, and product details
- Invoices: lifecycle management, branded PDFs, and payment follow-up
- Sales / POS: checkout flow, sales history, and receipts
- Customers: customer profiles, balances, and relationship history
- Expenses: expense capture and reporting
- Reports: revenue, P&L, analytics, and dashboards
- AI: demand, forecasting, and operational insights
- Media: upload/auth helpers for product and brand assets
- Subscriptions: plan and billing management

## Scale And Deployment Direction

BizZW currently ships as a monorepo, but the architecture notes already define a path toward larger scale:

- Tenant-isolated operations today, with a roadmap toward more scalable partitioning strategies
- Public runtime configuration for safer frontend deployment
- Background job telemetry and incident awareness for operational control
- Offline-safe mutation handling and idempotency for write reliability
- A roadmap toward service decomposition, stronger observability, and multi-region resilience

For the current deployment model, the frontend can be published to any static host, while the backend is designed to run in a Node.js environment with MongoDB, Redis, and the required external services configured via environment variables.

## Project Structure

```
bizzw/
├── backend/    Node.js + Express + TypeScript REST API
└── frontend/   React 19 + Vite + TanStack Router SPA
```

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run dev
# API: http://localhost:5000
```

### 2. Start the Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm run dev
# App: http://localhost:5173
```

## Environment Variables

### Backend (`backend/.env`)

| Variable                   | Description                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`              | MongoDB Atlas connection string                                                    |
| `JWT_ACCESS_SECRET`        | Random 32+ char secret                                                             |
| `JWT_REFRESH_SECRET`       | Different random 32+ char secret                                                   |
| `API_RATE_LIMIT_WINDOW_MS` | Global API limiter window in milliseconds (default `900000`)                       |
| `API_RATE_LIMIT_MAX`       | Global API limiter maximum requests per window                                     |
| `IMAGEKIT_PUBLIC_KEY`      | ImageKit.io public key                                                             |
| `IMAGEKIT_PRIVATE_KEY`     | ImageKit.io private key                                                            |
| `IMAGEKIT_URL_ENDPOINT`    | `https://ik.imagekit.io/yourID`                                                    |
| `RESEND_API_KEY`           | Resend.com API key                                                                 |
| `RESEND_FROM`              | Sender identity (e.g. `BizZW <noreply@bizzw.dev>`)                                 |
| `EMAIL_PROVIDER_PRIMARY`   | Email provider priority: `resend` (default) or `smtp`                              |
| `SMTP_HOST`                | SMTP fallback host (optional, used for Nodemailer failover)                        |
| `SMTP_PORT`                | SMTP fallback port (e.g. `587`)                                                    |
| `SMTP_SECURE`              | Set `true` for SMTPS/465, otherwise `false`                                        |
| `SMTP_USER`                | SMTP fallback username                                                             |
| `SMTP_PASS`                | SMTP fallback password                                                             |
| `SMTP_FROM`                | Optional sender identity for SMTP fallback                                         |
| `PAYNOW_INTEGRATION_ID`    | Paynow merchant ID                                                                 |
| `PAYNOW_INTEGRATION_KEY`   | Paynow merchant key                                                                |
| `PUBLIC_API_BASE_URL`      | Public backend base URL used for Paynow callbacks (e.g. `https://api.example.com`) |
| `GEMINI_API_KEY`           | Google Gemini API key                                                              |
| `CLIENT_URL`               | Frontend URL (e.g. `http://localhost:5173`)                                        |

Production values for your domain:

- `CLIENT_URL=https://bizzw.dev`
- `PUBLIC_API_BASE_URL=https://api.bizzw.dev`
- `RESEND_FROM=BizZW <noreply@bizzw.dev>`

### Frontend (`frontend/.env`)

| Variable                     | Description                                |
| ---------------------------- | ------------------------------------------ |
| `VITE_API_URL`               | Backend URL (e.g. `http://localhost:5000`) |
| `VITE_IMAGEKIT_PUBLIC_KEY`   | ImageKit.io public key                     |
| `VITE_IMAGEKIT_URL_ENDPOINT` | ImageKit.io URL endpoint                   |

## Testing And Builds

### Backend

```bash
cd backend
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run type-check
npm run build
npm run preview
```

## Deployment Notes

- Backend: deploy to a Node.js host with MongoDB, Redis, ImageKit, Resend, Paynow, and Gemini configured through environment variables.
- Frontend: deploy the built `frontend/dist` output to any static host.
- CI workflows are already included under `.github/workflows/` for backend quality checks, frontend checks, and frontend build/deploy.

## Contributing

Contributions are welcome. Suggested workflow:

1. Create a feature branch.
2. Make your changes and run the relevant tests locally.
3. Open a pull request once the checks pass.
