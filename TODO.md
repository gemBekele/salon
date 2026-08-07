# TODO — Serenity Salon & Spa ERP SaaS

Track of upgrade work and remaining follow-ups for `C:\Users\temesgenfi\Desktop\Gech_salon`.

## Status (as of last session)

### Done & verified
- [x] Auth/RBAC: JWT (scrypt + HMAC), roles `super_admin | tenant_manager | receptionist | staff`, tenant scoping
- [x] DB migrations (`db/migrate.ts --reset`) + seed (`db/seed.ts`) + demo users — confirmed working against XAMPP MySQL
- [x] Server-side POS: unique queue numbers (Q-104/Q-105 verified), atomic checkout tx, commission recompute (35% rule applied), net-total recompute, inventory deduction, loyalty, audit+commission logs, SMS receipt
- [x] RBAC enforcement (receptionist hitting mgmt route → 403), tenant-scoped `/api/db-state` (manager 1 company, super admin 2)
- [x] Reports API + CSV exports; ReportsDashboard + TenantAdminView wired to live API (summary/revenue/commissions/expenses + server CSV for visits, commissions, audit)
- [x] `npm run lint` and `npm run build` pass
- [x] README updated (setup, demo creds, role matrix, scripts)

## Remaining / nice-to-have
- [ ] `TenantAdminView` & `ReportsDashboard` local-mock fallback data (placeholders in daily-sales / category pie) — confirm they never show when server data is present
- [ ] Wire `StaffPerformanceDashboard` & `SaasAdminDashboard` if they still use static/mock data (not yet reviewed for API)
- [ ] `.env.local` secrets — confirm `GEMINI_API_KEY` is real for AI assistant, and `SMS_PROVIDER=http` config/URL for real SMS gateway
- [ ] Run a full live UI session (login as each demo role) and click through every tab to catch runtime regressions
- [ ] Consider frontend code-splitting — Vite warns the main bundle is >500 kB
- [ ] Init git repo + initial commit (currently not a git repo)

## How to run
```
npm run db:reset   # or db:migrate
npm run db:seed
npm run dev
```
Demo logins: `admin@serenity.et / Admin123!`, `admin@glamourserenity.et / Manager123!`, `sara@glamourserenity.et / Staff123!`, `abel@glamourserenity.et / Staff123!`