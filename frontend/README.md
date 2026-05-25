# BizZW Frontend 🇿🇼

Enterprise Business Management Dashboard for Zimbabwean SMEs.

## Tech Stack

- **Framework:** React 19 + TypeScript (strict)
- **Build Tool:** Vite 6
- **Routing:** TanStack Router (file-based)
- **Server State:** TanStack Query v5
- **Client State:** Zustand
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Media:** ImageKit React SDK
- **PDF:** @react-pdf/renderer
- **Icons:** Lucide React
- **Notifications:** Sonner
- **Monitoring:** Sentry (optional)

## Project Structure

```
bizzw-frontend/
├── src/
│   ├── shared/
│   │   ├── types.ts          # All TypeScript interfaces & enums
│   │   └── utils.ts          # Currency (ZiG/USD), date, formatting
│   ├── routes/               # TanStack Router file-based routes
│   │   ├── index.tsx         # Marketing landing page
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── pricing.tsx
│   │   ├── _dashboard.tsx    # Auth guard + layout wrapper
│   │   └── _dashboard/
│   │       ├── dashboard.tsx # KPI overview + charts
│   │       ├── inventory/    # Product management
│   │       ├── invoices/     # Invoice builder + PDF
│   │       ├── sales/        # Sales history + receipts
│   │       ├── pos.tsx       # Point of Sale interface
│   │       ├── customers/    # Customer profiles
│   │       ├── expenses.tsx  # Expense tracker
│   │       ├── reports.tsx   # Analytics dashboard
│   │       ├── ai.tsx        # AI insights (SSE streaming)
│   │       └── settings/     # Profile, business, team, billing
│   ├── components/
│   │   ├── ui/               # Button, Input, Modal, Table, etc.
│   │   ├── layout/           # DashboardLayout + sidebar
│   │   ├── InvoicePDF.tsx    # PDF invoice renderer
│   │   ├── ImageKitProvider.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useApi.ts         # All TanStack Query hooks
│   │   ├── useCommandPalette.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   ├── lib/
│   │   ├── api.ts            # Axios client + token refresh
│   │   ├── queryClient.ts    # TanStack Query client + queryKeys
│   │   ├── imagekit.ts       # ImageKit URL builder
│   │   ├── invoicePdf.tsx
│   │   └── cn.ts             # Tailwind class merger
│   ├── store/
│   │   ├── auth.store.ts     # Auth state (Zustand + persist)
│   │   ├── cart.store.ts     # POS cart state
│   │   └── theme.store.ts    # Dark mode
│   ├── index.css             # Tailwind + global styles
│   └── main.tsx              # React entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

Tailwind v4 is configured through `src/index.css` using `@import "tailwindcss"` + `@theme` tokens.
No `tailwind.config.js` or `postcss.config.js` is required.

## Design Consistency Guide

- Global visual tokens (color, typography, base surfaces) are defined in `src/index.css`.
- Light/dark mode is resolved before React mounts via `index.html` bootstrap script, preventing first-paint theme mismatch.
- Shared UI primitives (`Button`, `Card`, `Badge`, `Input`, `Modal`, etc.) live in `src/components/ui/index.tsx` and should be preferred over one-off styles.
- Chart palette and chart chrome (grid, axis ticks, tooltip, legend) are centralized in `src/lib/chartTheme.ts`.
- For new analytics charts, import chart constants from `src/lib/chartTheme.ts` instead of hardcoding hex colors.
- Chart variables are theme-aware via CSS variables in `src/index.css`, so chart readability remains consistent in both light and dark mode.
- `src/index.css` includes theme safety shims for legacy utility classes so surfaces, borders, and typography stay aligned with the active mode platform-wide.
- Avoid hardcoded runtime colors in route/component files; prefer tokens (`primary`, `accent`, `slate`, semantic state colors) and explicit `dark:` variants.
- The in-app guide panel (`PageGuidePanel`) is closed by default on first load and uses a persisted toggle state for predictable behavior.

Example:

```tsx
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID, CHART_TOOLTIP } from '../lib/chartTheme';

<CartesianGrid {...CHART_GRID} />
<XAxis tick={CHART_AXIS_TICK} />
<Tooltip {...CHART_TOOLTIP} />
<Bar dataKey="value" fill={CHART_COLORS.primary} />
```

## Prerequisites

- Node.js 22+
- npm 10+
- BizZW Backend running (see `bizzw-backend/`)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable                         | Description                                |
| -------------------------------- | ------------------------------------------ |
| `VITE_API_URL`                   | Backend URL (e.g. `http://localhost:5000`) |
| `VITE_APP_NAME`                  | App name (default: `BizZW`)                |
| `VITE_IMAGEKIT_PUBLIC_KEY`       | From ImageKit.io dashboard                 |
| `VITE_IMAGEKIT_URL_ENDPOINT`     | e.g. `https://ik.imagekit.io/yourID`       |
| `VITE_SENTRY_DSN`                | Sentry DSN for frontend error monitoring   |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Frontend tracing sample rate (`0`-`1`)     |

### 3. Run in development

```bash
npm run dev
```

App will be available at `http://localhost:5173`

> **Note:** TanStack Router auto-generates `src/routeTree.gen.ts` on first run — this file is gitignored. It is created automatically by Vite when you run `npm run dev`.

### 4. Build for production

```bash
npm run build
```

Output is in `dist/`. Serve with any static host (Vercel, Netlify, etc.).

### 5. Preview production build

```bash
npm run preview
```

## Features

| Route                | Feature                                           |
| -------------------- | ------------------------------------------------- |
| `/`                  | Marketing landing page with pricing               |
| `/dashboard`         | KPI cards, revenue chart, low stock alerts        |
| `/inventory`         | Product table with search, filter, CSV export     |
| `/inventory/new`     | Add product form                                  |
| `/inventory/:id`     | Edit product + stock history + image upload       |
| `/invoices`          | Invoice list with status filters                  |
| `/invoices/new`      | Invoice builder with live totals                  |
| `/invoices/:id`      | Invoice detail + PDF download                     |
| `/pos`               | Full-screen Point of Sale                         |
| `/sales`             | Sales history with CSV export                     |
| `/customers`         | Customer list + profiles                          |
| `/expenses`          | Expense tracker with category charts              |
| `/reports`           | Revenue, P&L, Inventory, Customer LTV             |
| `/ai`                | Gemini AI: forecast, restock, insights, anomalies |
| `/settings/profile`  | Avatar upload, password change                    |
| `/settings/business` | Logo, VAT rate, currency, timezone                |
| `/settings/team`     | Invite staff, manage roles                        |
| `/settings/billing`  | Subscription plans + Paynow upgrade               |

## Free Hosting (Vercel)

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables from `.env.example`

Vercel automatically handles SPA routing.
