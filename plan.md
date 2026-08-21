# Serenity Salon & Spa — Feature Expansion Plan

> Approved by the owner/gemg2. This is the source of truth; every change should match it.
> Progress is tracked separately in `progress.md`.

## Current state (verified in code)
- Checkout is **inline in the POS row** (`ReceptionistPos.tsx:1032`), single payment, no modal, no split, no receipt attach, no cashback; discount exists on `visit_sessions.discount_etb` but has no checkout UX entry point.
- Commission: `commission_rules` supports `staff` and `service` targets; **staff rule wins** (`pos.ts:447`).
- Queue numbers: `Q-{last+1}` starting at 100, never resets (`pos.ts:136`). TV shows masked phone instead of queue number (`QueueDisplayView.tsx:103`).
- Queue list is **not explicitly sorted** (`ReceptionistPos.tsx:235`).
- Roles: `super_admin | tenant_manager | receptionist | staff`.
- SMS: `SMS_PROVIDER=log` console logger already in place.

## 0. Database (new migrations `009`+)
New tables:
- `banks` (id, company_id, name, code, is_active, created_at) — **configurable bank list** (manager/owner).
- `service_bundles` (id, company_id, branch_id, business_unit_id, name, description, is_active) + `service_bundle_items` (id, bundle_id, service_id, price_etb) — per-item price defines bundle total.
- `material_sales` (id, company_id, branch_id, customer_id, name, phone, subtotal, discount, net_total, is_paid, paid_at, created_at) + `material_sale_items` (id, sale_id, inventory_item_id, name, sku, unit, quantity, unit_price, total) — separate retail pipeline.
- `payments` (id, company_id, branch_id, payable_type `visit|material_sale|group`, payable_id, method `cash|bank`, bank_id, txn_reference, amount_etb, cashback_etb, receipt_path, created_by, created_at) — **supports split payments** (multiple rows per bill) and takes over from `visit_sessions.payment_method`.
- `group_visits` (id, company_id, branch_id, name, note, subtotal, discount, tax, net_total, status, created_at, completed_at) + `group_visit_members` (id, group_id, visit_session_id) — special-service teams; members stay individual queue tickets.
- `feedback` (id, company_id, branch_id, visit_session_id, customer_id, rating 1–5, complaint, created_at) — **per visit**, captured on the tablet or reception.
- `uploads/` folder for receipt images (compressed locally), path stored on the `payments` row.

Alterations:
- `users.role` CHECK → add `owner`, rename values: `receptionist→reception`, `tenant_manager→manager` (data UPDATE in migration). Super_admin and staff stay.
- Queue numbering: `nextQueueNumber()` resets to `Q-001` per branch per calendar day.
- Remove/soft-deprecate `payment_method` on `visit_sessions` in favor of `payments`.

## 1. Commission (person vs service based)
- **Precedence flip: service rule wins** (was staff wins).
- Calculate on **gross service price**, never on discounted/net.
- Fallback stays `staff.default_commission_percentage` (default 30).
- Applies per line item; unchanged for staff-targeted rules. Bundle items and group members compute the same way (per line item, per staff).

## 2. Payment checkout modal (reception dashboard)
Replace inline row payment UI with a proper `PaymentCheckoutModal`:
- Method: **Cash | Bank**. Bank → dropdown of `banks` + **txn number** field.
- **Receipt image attachment** → compressed, stored in `uploads/`, path saved, per-payment.
- **Split amounts**: one checkout can carry multiple payment lines (e.g. Cash 500 + CBE Birr 1300), each with own bank/txn.
- **Cashback**: bank overpayment, difference returned in cash → recorded as `cashback_etb`; receipt shows paid / cashback / net.
- **Advanced collapsible**: txn ref, discount, cashback.
- **Discount only at checkout** (no per-service, no pre-set at creation), no cap.
- Net total recomputed server-side (`sum(service prices) − discount`); idempotence guard kept.
- `PrintableInvoice` updated to show split lines, cashback, banks, txn refs.

## 3. Queue table ordering (reception)
- Default order: **completed & unpaid first**, then everything else **newest-created first** (replaces current unsorted list).

## 4. Daily analytics (ReportsDashboard)
- Add date range + filters: **bank/banks, cash, service category, staff**.
- Filtering backed by `payments` (method/bank) and `visit_session_services` (staff/category).
- KPIs reflect split payments correctly (bank amount vs cash amount, cashback net-outs).

## 5. Reassign staff
- New per-service **reassign** in POS; **blocked once service status = completed**; allowed for pending + in_progress. Audit log row on reassign.

## 6. Roles
- `reception` (POS, retail, walk-in, queue ops), `manager` (reception + analytics + full staff data), `owner` (manager + company config: branches, staff, commission rules, banks, bundles, expense limits), `super_admin` (SaaS), `customer` (no login — tablet + website self-service only).
- Auth guards (`mgmtOnly`/`posOnly`), seed accounts, and Tenant Admin UI updated for new role names; seed gets an owner account.

## 7. Queue numbers & TV
- Format `Q-001`… 3-digit, **daily reset per branch**. Used everywhere: POS, receipts, SMS, tablet, TV.
- **TV displays the queue number** instead of the masked phone number.

## 8. Walk-in registration tablet (+ new `/tablet` route)
- Register with **phone (required), name (optional)**; optionally pick **service + staff**, or walk in without.
- Always issues a queue number; if staff picked → routed to that staff's TV column, and if that staff is free the service can start immediately.
- Success screen shows **big 3-digit ticket number**.
- Public/unauthenticated endpoints (branch-bound), same find/create-by-phone logic as appointments.

## 9. Feedback & rating (same tablet interface)
- Fixed feedback entry per current ticket — customer can rate any time.
- **Per visit** rating (1–5) + optional complaint; works for individual and group members (reception opens member's session on tablet).

## 10. Material / retail sales
- New **Retail tab** on reception dashboard with item cart.
- **Separate tables** (`material_sales` + `material_sale_items`); stock deducted **at payment** from `inventory_items`.
- Price = **inventory selling price, locked** (not editable at POS). **No staff commission**. Shares the same payment modal (cash/bank/split/discount/attach).

## 11. Bundle services
- Manager/owner CRUD: bundle with per-service items and **price per sub-service** (total = sum).
- Selecting a bundle expands into line items (each routed to staff queue). **Proration**: only used sub-services billed at checkout; unused dropped before payment. Stock/commission computed per line item as usual.

## 12. Special service (teams / groups)
- Reception creates a group, adds individuals → each member becomes an individual queue ticket + service (visible on TV).
- **One bill at the end**: group checkout modal with group-level **discount + flexible total**; single payment across members (`payments.payable_type='group'`).
- Commissions per member line item; members can each give tablet feedback.

## 13. SMS
- All events (registration confirm, queue turn, receipt, group/members) dispatched through existing `sms` service with **`SMS_PROVIDER=log`** until a real provider API is provided.

## Build order (each step shippable)
1. Migrations 009+ + `types` + seed (banks, owner account, demo bundle, daily queue reset).
2. Payments (payments table, modal, split, cashback, uploads, discount-at-checkout, invoice).
3. Queue ordering + 3-digit numbers + TV + reassign.
4. Retail/materials.
5. Roles rework.
6. Analytics filters.
7. Walk-in tablet + feedback.
8. Bundles.
9. Groups.
10. SMS wiring + commission precedence flip (service wins, gross base) + final QA (`npm run lint`, tests).

## Decisions locked via Q&A

### Commission
- Precedence: **service rule wins** over staff rule.
- Commission base: **gross service price** (discounts do not reduce staff commission).

### Material / retail sales
- UI: **new "Retail" tab** on the reception dashboard.
- Stock deducted **at payment** (atomic, like services).
- Price = inventory `selling_price_etb`, **locked** (not editable at POS).
- **No staff commission** on material sales.
- **Separate tables** (`material_sales` + `material_sale_items`), own payment pipeline.

### Payment modal
- Method = **Cash | Bank**; Bank opens a configurable **bank dropdown** + **txn number** field.
- **Receipt attachment** stored **on the local server, compressed**; path saved to DB.
- Discount entry: **only at checkout** (inside advanced collapsible), not at session creation, no cap.
- Cashback recorded as **paid_amount + cashback_etb** fields; revenue = net; receipt shows both.
- **Split amounts supported** (one bill → multiple cash/bank lines each with own txn ref).

### Queue table
- Order = **completed-unpaid first**, then **newest-created first**.

### Analytics
- Target page = **ReportsDashboard** + new filters (date, bank/cash, service category, staff).

### Reassign
- **Blocked only when service status = completed**; allowed for pending/in-progress.

### Roles
- **Rename & split**: `receptionist→reception`, `tenant_manager→manager`, new **`owner`** role; keep `super_admin` + `staff`.
- Owner = manager + company config (branches, staff, commission rules, banks, bundles, expense limits). Manager = reception + analytics + full staff data.
- Customer is a **service user** (walk-in tablet + website), no login.

### Queue numbers
- Format **`Q-001`**, 3-digit, **daily reset** (scope: **per branch per calendar day**).
- Walk-in always gets a queue number; picking service+staff adds to that staff's TV column; if staff is free the service can start immediately.

### Walk-in tablet
- Register with **phone (required)** + **name (optional)**; optional service + staff; or walk in with neither.
- Success screen shows **big ticket number**.
- Feedback entry is **any-time, self-selectable**; rating is **per visit** (1–5 + optional complaint); group members can also give feedback on the same tablet.

### Bundles
- Bundle total = **sum of per-sub-service prices** (no extra discount field).
- Partial use → **prorated by used services** (unused dropped before payment).

### Groups (special service)
- One bill, **one payment** across members; **group-level discount**; **flexible total** set by reception.
- Members remain individual queue tickets; individual commissions + feedback.

### SMS
- Everything through the existing sms service with **`SMS_PROVIDER=log`** until a real provider API is given.

## Open items
- Nothing blocking. (Queue reset scope defaulted to per-branch calendar-day.)