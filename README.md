# Serenity Salon & Spa — ERP SaaS (React + Express + MySQL + Gemini)

A professional ERP for salon & spa groups with role‑based access, tenant scoping,
server-side POS/commission logic, SMS receipts, reports/CSV exports, and AI
assistant. Multi-tenant, single database (every table carries `company_id`;
`super_admin` acts globally while all other roles are locked to their tenant).

## Prerequisites

- Node.js 18+
- XAMPP / MySQL 5.7+ (or 8.x/MariaDB)

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Configure environment. Copy `.env.example` to `.env.local` and fill real values
   (DB credentials, `JWT_SECRET`, `GEMINI_API_KEY`, SMS provider):

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=
   DB_DATABASE=gech_salon_db

   JWT_SECRET=change-me-to-a-long-random-string
   JWT_EXPIRES_IN=8h

   GEMINI_API_KEY=your-key
   GEMINI_MODEL=gemini-2.5-flash

   SMS_PROVIDER=log            # 'log' simulates SMS; 'http' calls SMS_PROVIDER_URL
   SMS_PROVIDER_URL=
   SMS_API_KEY=
   SMS_SENDER_ID=Serenity
   ```

3. Create the database, run migrations, and seed reference data + demo users:

   ```
   npm run db:migrate     # apply pending migrations
   npm run db:seed        # seed reference data + RBAC accounts
   ```

   To wipe and rebuild from scratch:

   ```
   npm run db:reset       # drops & recreates DB, applies all migrations
   npm run db:seed
   ```

4. Start the app:

   ```
   npm run dev
   ```

## Demo Accounts

| Role            | Email                     | Password     | Scope            |
| --------------- | ------------------------- | ------------ | ---------------- |
| super_admin     | `admin@serenity.et`       | `Admin123!`  | all tenants      |
| tenant_manager  | `admin@glamourserenity.et`| `Manager123!`| Glamour & Serenity |
| receptionist    | `sara@glamourserenity.et` | `Staff123!`  | Glamour & Serenity |
| staff           | `abel@glamourserenity.et` | `Staff123!`  | Glamour & Serenity |

## Role / Persona matrix

- `super_admin` — SaaS admin: global companies, subscriptions, audit, reports.
- `tenant_manager` — configure branches/units/staff/services/inventory/commission rules, expenses.
- `receptionist` — POS: queue customers, checkout, dispatch SMS.
- `staff` — read-only queue/persona views (styled for the operator).

## Scripts

| Script          | Description                                        |
| --------------- | -------------------------------------------------- |
| `npm run dev`   | Vite + bundled Express server (single process)     |
| `npm run build` | Production build (frontend + `dist/server.cjs`)    |
| `npm run lint`  | TypeScript typecheck                               |
| `db:migrate`    | Apply pending `db/migrations/*.sql` migrations     |
| `db:reset`      | Drop & recreate DB from migrations                 |
| `db:seed`       | Seed reference data + demo users                   |

## Notes

- Commissions, queue numbers, totals, and inventory deductions are computed
  **server-side**, never trusted from the client.
- SMS is abstracted (`server-lib/sms.ts`): `log` prints to console, `http` posts to
  a real gateway with one retry. Receipts/queue alerts are dispatched after commit.
- Migrations live in `db/migrations/` and are tracked in the `schema_migrations` table.