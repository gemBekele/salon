# Gech Salon — Internal ERP UI Overhaul (shadcn + sharp edges)

> Living document. Update the **Progress** checklist as work completes so the
> project can be resumed at any moment. Every detail needed to pick up mid-way
> lives here.

## Goal

Rebuild the internal ERP UI (`App.tsx` "erp" view: Sidebar + persona dashboards,
plus the TV queue board) on **shadcn/ui primitives with sharp edges** (radius 0),
with **full dark/light theming** and **live data refresh** for the reception and
staff views, while keeping the public website untouched.

Palette stays on-brand: ink charcoal (`#0a0a0c`–`#26262b`), brass/gold accents,
warm cream, Oswald display + Plus Jakarta Sans body (already defined in
`src/index.css`).

## Verified research (as of this work)

### Auth (resolved)
- `server-lib/middleware.ts:142-156` — `authenticate` reads `Authorization: Bearer <jwt>`
  first, falls back to the httpOnly `sserp_token` cookie.
- `server-lib/routes/auth.ts:36-43` — login sets BOTH the httpOnly cookie and
  returns `{ token, user }` in JSON; client stores `token` in `localStorage['sserp_token']`.
- Client helpers in `src/lib/api.ts`: `getToken/setToken/clearToken`, `ApiError`,
  `readApiError`, `apiOk`, `apiFetch` (adds Bearer header; on 401 clears token and
  dispatches `window` event `auth:expired`).
- JWT = HS256, signed with `process.env.JWT_SECRET`, expiry `JWT_EXPIRES_IN` (default 8h),
  in-memory `tokenBlacklist` on logout (`server-lib/auth.ts`).

### Queue numbers — server-authoritative
- `server-lib/routes/pos.ts:136-145` — `nextQueueNumber()`: `SELECT … FOR UPDATE` on the
  branch row, reads last `queue_number` ordered by `started_at DESC`, default `Q-100`, returns `Q-NNN`.
- Client-side predictions are only display guesses and are overwritten by the server:
  - `ReceptionistPos.tsx:175-182` (local `nextQueueNumber` memo)
  - `AppointmentBookingModal.tsx:118` (random `Q-xxx`; replaced by server `data.queueNumber` at line 129)
- `/api/public/appointments` (unauthenticated) validates `companyId, branchId, customerName,
  customerPhone`; creates/finds customer by phone; stores `appointmentDate/appointmentTime`
  inside `notes`; dispatches SMS `queue_turn_alert`; returns `{ success, id, queueNumber, customerId }`.

### Public booking flow
- `src/components/AppointmentBookingModal.tsx` (5 steps): service → barber (`selectedStaffId`,
  `'any'` allowed) → date/time → customer details → confirmation ticket.
- Payload (lines 94-115): `companyId, branchId, customerName, customerPhone, customerEmail,
  appointmentDate, appointmentTime, notes, subtotalEtb, netTotalEtb, services[{serviceId,
  serviceName, staffId, staffName, priceEtb, durationMinutes}]`.
- Server validates each `staffId` against DB (falls back to `null`), service falls back to
  `srv_m_haircut` (pos.ts:77-104).
- Confirmation modal builds a local `VisitSession` for optimistic UI sync then calls
  `fetchDbState()` (App.tsx:647-652).

### Data architecture
- All ERP views are **pure props-driven** components. State lives in `App.tsx` and is loaded
  from a single endpoint `/api/db-state` via `fetchDbState()` (`server-lib/routes/admin.ts`).
- Mutations: view → prop handler in `App.tsx` → `apiFetch(...)` → `fetchDbState()`.
- Polling (added by this work): `QueueDisplayView` 10s, `ReceptionistPos` 10s,
  `StaffPortalView` 15s — all via `src/lib/usePolling.ts` and each receives
  `onRefresh={fetchDbState}` from `App.tsx`. Polling pauses when the tab is hidden.
- `handleUpdateSessionStatus` (App.tsx:359-383) does an optimistic local update; the server
  PATCH `/api/visit-sessions/status` handles `synth_*` demo ids, dispatch of `in_progress`
  SMS, and completion. Checkout is atomic server-side (commissions, loyalty, inventory).

### Build tooling (Tailwind v4 — already wired)
- `@tailwindcss/vite` plugin active (`vite.config.ts`). No `tailwind.config.js` needed (v4 = CSS config).
- `src/index.css`: `@theme` tokens `--color-ink-*` (charcoal), `--color-brass-*` (gold),
  `--color-cream-*`; `--font-display: Oswald`; base layer; helper classes
  `bg-natural-*`, `text-natural-*`, `border-natural`.
- `vite.config.ts` alias: `'@': path.resolve(__dirname, '.')` — points at the project ROOT and
  is currently **unused** (no `@/` imports in `src/`). shadcn generates `@/components/ui/...`
  imports, so repoint `@` → `src` (safe: no existing usage).
- No `components.json`, no `src/lib/utils.ts` yet — created by shadcn init.
- Commands: `npm run dev` (tsx server.ts), `npm run lint` (tsc --noEmit),
  `npm test` (vitest, 27 tests), `npm run build` (vite + esbuild server bundle).

### Personas → components (`App.tsx`)
| Persona | Role(s) | Component |
|---|---|---|
| `saas_super_admin` | super_admin | `SaasAdminDashboard` |
| `tenant_admin` | tenant_manager | `TenantAdminView` (2208 lines) |
| `receptionist` | tenant_manager, receptionist | `ReceptionistPos` (918) |
| `queue_tv` | tenant_manager, receptionist | `QueueDisplayView` (fullscreen, no sidebar) |
| `staff_member` | staff | `StaffPortalView` (855) |
| `architect_lead` | super_admin, tenant_manager | `ArchitectBlueprintView` (static mock) |

Sidebar + LoginScreen + modals (AiAssistant, CustomerLogin, AppointmentBooking) live in
`App.tsx`'s ERP subtree. `QueueDisplayView` is the only 100%-fullscreen persona.

## Theme spec

### Sharp edges
- Set `--radius: 0px` (and all radius tokens `0`) in the shadcn theme block. This makes every
  shadcn primitive square — satisfies "sharp edges for everything".
- Remove `rounded-*` from hand-rolled JSX as components are migrated to shadcn primitives.

### Dark / light toggle (BOTH, per user)
- Use shadcn CSS-variable theme + `.dark` class strategy (`@custom-variant dark (&:is(.dark *))`).
- Add a `<ThemeProvider>` (client component) or minimal context toggling `document.documentElement.classList`.
- Persist choice in `localStorage` (key e.g. `sserp_theme`); default to **light** for the ERP
  (matches today's cream look). The public website keeps its own independent `websiteTheme` state.
- Map semantic tokens so light ≈ current cream/charcoal look and dark ≈ website ink/brass look:
  - `background` → `cream-200 #f6f3ec` (light) / `ink-950 #0a0a0c` (dark)
  - `foreground` → `ink-800 #18181b` (light) / `cream-100 #fbfaf7` (dark)
  - `card`/`popover` → white (light) / `ink-900 #111114` (dark)
  - `muted` → `cream-300 #efe8d9` (light) / `ink-800 #18181b` (dark)
  - `primary` → `ink-800` (light) / `brass-400 #d0a75b` (dark)
  - `border` → `cream-300 #efe8d9` (light) / `ink-700 #26262b` (dark)
  - `accent`/`ring` → brass tones
- Keep the existing `ink`/`brass`/`cream` Tailwind color tokens — they are referenced all over
  existing components and remain valid; shadcn semantic vars layer on top.

### Fonts
- shadcn default body font will be overridden to `--font-sans: 'Plus Jakarta Sans'`,
  headings to `--font-display: 'Oswald'` (already present in `@theme`). Apply via
  semantic mapping in the shadcn block (e.g. `--font-sans` and a `--font-heading`).

## Live-refresh (polling) strategy

- Add a small reusable hook `usePolling(fetcher, intervalMs, deps)` in `src/lib/usePolling.ts`
  (or inline) that runs `fetcher` immediately and on a `setInterval`, guarded against overlap.
- Apply:
  - `ReceptionistPos` → poll `fetchDbState` (via new `onRefresh` prop) every **10s**.
  - `StaffPortalView` → poll every **15s**.
  - `QueueDisplayView` already polls; keep 10s and keep `onRefresh`.
- Wire `onRefresh={fetchDbState}` to both views from `App.tsx` (already passed to QueueDisplayView).
- Guard: pause polling when the document is hidden (`document.visibilitychange`) to save battery.

## Phase plan

### Phase 0 — shadcn init + theme foundation  ✅ DONE
- `@` alias repointed to `src/` in `vite.config.ts` AND `tsconfig.json` (`@/*` → `./src/*`); generated `components/ui/*` + `lib/utils.ts` moved into `src/`.
- `npx shadcn@latest init --template vite -p nova` (Base UI + Lucide + CSS variables). `components.json` at root.
- `src/index.css`: removed Geist font, added Plus Jakarta Sans Google import; `--radius: 0px` (sharp edges); semantic vars mapped to ink/brass/cream for BOTH `:root` (light) and `.dark`.
- `src/lib/theme.tsx`: `ThemeProvider` + `useTheme` (light/dark/system, persisted in `localStorage['sserp_theme']`, applies `.dark` class on `<html>`). Wrapped `<App>` in `src/main.tsx`.
- Sidebar theme toggle added (Sun/Moon), bottom actions.
- Primitives installed under `src/components/ui/`: button, card, badge, select, input, label, table, tabs, dropdown-menu, sonner, scroll-area, separator, skeleton, radio-group, dialog, sheet.
- `sonner.tsx` rewired to local `useTheme` (removed `next-themes`); removed unused `@fontsource-variable/geist`.
- Verified: `npm run lint` clean, `vite build` succeeds.

### Phase 1 — QueueDisplayView (TV queue board)
File: `src/components/QueueDisplayView.tsx` (38.5 KB), i18n `src/lib/queue-translations.ts`.
- Convert cards/tables/pills to shadcn `Card`, `Badge`, `Table` with sharp edges.
- Keep: fullscreen layout, 10s poll, `onRefresh`, Amharic/English translations, rotation.
- Dark-on-black is the natural look for a lounge TV; default this view to dark regardless of toggle.

### Phase 2 — ReceptionistPos (reception)
File: `src/components/ReceptionistPos.tsx` (918 lines).
- New props: add `onRefresh?: () => void` (and optional `isRefreshing`). Poll 10s.
- Migrate: header bar → `Card`; tab nav → `Tabs`; tables → `Table`; modals → `Dialog`;
  payment method grid → `RadioGroup`/`Card` buttons; badges → `Badge`; inputs → `Input`/`Select`.
- Add a visible "last updated / refresh" indicator.

### Phase 3 — StaffPortalView (barber)  ✅ DONE
File: `src/components/StaffPortalView.tsx` (855 lines).
- Add `onRefresh` prop + 15s poll. Migrate to shadcn primitives (same set as reception).
- Keep payout-request 4s reset timer (line 132) and session/service workflow intact.
- Status pills and payout pill converted to `Badge`; `onRefresh={fetchDbState}` wired in App.tsx.

### Phase 4 — TenantAdminView + SaasAdminDashboard (owner / cashier)  ✅ DONE (token pass)
Files: `src/components/TenantAdminView.tsx` (113 KB, 2208 lines), `src/components/SaasAdminDashboard.tsx`.
- Migrate in chunks: shared sub-sections (staff, services, inventory, expenses, commissions,
  users, audit). Prefer shadcn `Table` + `Dialog` + `Form`-style inputs.
- SaasAdminDashboard: companies table, subscription plans, SMS log → shadcn primitives.
- **Status:** hardcoded colors + `bg-white` bulk-converted to semantic tokens + `bg-card`
  (TenantAdminView, SaasAdminDashboard, and shared ERP components CustomerSearchSelect,
  ReportsDashboard, StaffPerformanceDashboard, LoginScreen, WeeklyScheduler, AiAssistantModal).
  `PrintableInvoice` intentionally left light (print-only). Per user decision, the hand-rolled
  table/modal markup stays as-is — no shadcn `Table`/`Dialog` component swap. **Complete.**

### Verification
- `npm run lint` (tsc --noEmit) — must pass.
- `npm test` (vitest) — 27 tests must pass.
- `npm run build` — must succeed.
- Manual smoke: login (admin@gechsalon.et / Manager123!), each persona renders, theme toggle
  flips dark/light, new online booking appears in reception queue within 10s.

## Commands

```bash
npm run dev        # dev server (tsx server.ts) — http://localhost:3000
npm run lint       # tsc --noEmit
npm test           # vitest run
npm run build      # vite build + esbuild server bundle
```

Creds: admin@gechsalon.et / Manager123! (tenant) • liya@gechsalon.et / Staff123! (receptionist)
• admin@serenity.et / Admin123! (super).

## Progress

- [x] Phase 0 — shadcn init + theme
- [x] Phase 1 — QueueDisplayView
- [x] Phase 2 — ReceptionistPos + polling
- [x] Phase 3 — StaffPortalView + polling
- [x] Phase 4 — TenantAdminView + SaasAdminDashboard (token pass; no primitive swap per user)
- [x] Verify lint / tests / build — lint clean, 27/27 vitest pass, `npm run build` succeeds; smoke-tested `/api/auth/health`, login, and `/api/db-state` (all 200)
