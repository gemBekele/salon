# Serenity Salon & Spa Management ERP SaaS

> **Enterprise Multi-Tenant & Multi-Branch Salon Management System**  
> *Powered by React, TypeScript, Express, XAMPP MySQL, and Google Gemini AI.*

---

## 📌 Executive Summary

**Serenity Salon & Spa ERP** is an enterprise-grade, multi-tenant Software-as-a-Service (SaaS) platform tailored for multi-branch salon, spa, and beauty parlor businesses. Designed specifically to handle real-world operations in modern salon enterprises (with Ethiopia/ETB localization defaults), the system enables tenant isolation, real-time POS queue tracking, automated staff commission calculations, live inventory stock deductions, SMS customer alerts, security audit logging, and AI-driven business analytics.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide React |
| **Backend API** | Node.js, Express.js (`server.ts`) |
| **Database** | MySQL (XAMPP Local Server on Port 3306) via `mysql2` |
| **AI Integration** | Google Gemini AI (`@google/genai`) |
| **Deployment Target** | Laravel 11 / Node.js Engine & cPanel Queue Workers |

---

## 🏗️ Core System Architecture & Multi-Tenancy

The platform follows a **Single-Database Multi-Tenant Architecture** where all entities are logically scoped by a mandatory `company_id`.

```
                  ┌─────────────────────────────────────┐
                  │    SaaS Super Admin Platform        │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
      ┌──────────▼───────────┐                ┌──────────▼───────────┐
      │   Tenant Company A   │                │   Tenant Company B   │
      │  (Glamour & Serenity)│                │   (Royal Spa Group)  │
      └──────────┬───────────┘                └──────────┬───────────┘
                 │                                       │
        ┌────────┴────────┐                     ┌────────┴────────┐
        │                 │                     │                 │
  ┌─────▼──────┐   ┌──────▼─────┐         ┌─────▼──────┐   ┌──────▼─────┐
  │ Branch 1   │   │ Branch 2   │         │ Branch 1   │   │ Branch 2   │
  │(Addis)     │   │(Hawassa)   │         │(Kazanchis) │   │(Adama)     │
  └─────┬──────┘   └────────────┘         └────────────┘   └────────────┘
        │
  ┌─────┴────────────────────────┐
  │                              │
┌─▼───────────────┐    ┌─────────▼──────┐
│  Men's Salon    │    │ Women's Spa    │
└─────────────────┘    └────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. ✂️ Receptionist POS & Live Queue Board
- Real-time customer check-in, queue number generation (`Q-101`, `Q-102`), and staff assignment.
- Live status board (`queued`, `in_progress`, `completed`, `cancelled`).
- Integrated SMS dispatch upon session status changes.
- Multi-payment rail support (**Telebirr, CBE Birr, Cash, POS Card**).

### 2. ⚡ Atomic Checkout & Commission Engine
- Executes server-side transactions for payments.
- Grants customer loyalty points (+1 point per 10 ETB spent) and updates VIP status.
- Deducts inventory consumables automatically based on service requirements.
- Calculates tiered staff commissions (Staff custom rule > Service custom rule > Default percentage rate).

### 3. 🏢 Tenant Executive & Multi-Branch Manager
- Manage branches, business units, staff shifts, service catalogs, inventory items, expenses, and audit logs.
- Configure staff/service custom commission rules.
- View financial reports, completed revenues, and low-stock alerts.

### 4. 👑 SaaS Super Admin Dashboard
- Manage tenant companies, subscription plans (**Starter, Pro Multi-Unit, Enterprise**), system health, and global SMS logs.

### 5. 📺 TV Waiting Room Queue Display
- Full-screen TV display view for waiting rooms showing active queues, serving stations, and upcoming customer turn alerts.

### 6. 🤖 Gemini AI ERP Assistant
- AI copilot integration for salon managers to generate revenue forecasts, optimize staff schedules, analyze peak hours, and detect stock anomalies.

### 7. 📐 Senior SaaS Architect Blueprint
- Built-in 16-section technical documentation view providing Laravel 11 Eloquent scope code, database ERD schema, cPanel cron deployment, RBAC permissions matrix, and edge-case concurrency rules.

---

## 🗄️ Database Schema (`gech_salon_db`)

The database consists of **16 normalized tables** hosted on XAMPP MySQL:

1. `subscription_plans`: Subscription tiers and max branch/staff limits.
2. `companies`: Multi-tenant companies.
3. `branches`: Physical salon branches.
4. `business_units`: Specific units inside branches (Men's Salon, Spa, Hammam).
5. `staff`: Staff members, roles, specialties, and commission percentages.
6. `services`: Service catalog items, prices in ETB, and durations.
7. `service_inventory_requirements`: Consumables mapping for each service.
8. `inventory_items`: Stock tracking, reorder levels, unit costs.
9. `customers`: Customer profiles, visit counts, spending, and loyalty points.
10. `visit_sessions`: Customer walk-in sessions, queue status, subtotal, and payment details.
11. `visit_session_services`: Service line items linked to visit sessions and staff.
12. `commission_rules`: Custom rule overrides for staff or services.
13. `commission_logs`: Historical audit of staff commission payouts.
14. `expenses`: Operating expense records (rent, utilities, salaries).
15. `sms_logs`: Transactional SMS notification logs.
16. `audit_logs`: Security and operational audit log trails.

---

## 💻 Local Setup & Running Instructions

### Prerequisites
- **Node.js** (v18+)
- **XAMPP Server** (Apache & MySQL running on default port `3306`)

### Step 1: Start XAMPP MySQL
Ensure XAMPP Control Panel is started and the **MySQL** module is active on port `3306`.

### Step 2: Database Initialization
The SQL DDL and seed data script is located in `create_db.sql`.  
Execute the script using phpMyAdmin or the MySQL CLI:
```bash
mysql -u root -p < create_db.sql
```

### Step 3: Environment Setup
Verify `.env.local` contains the following settings:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=gech_salon_db
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 4: Run Application
Install dependencies and start the development server:
```bash
npm install
npm run dev
```

Access the application in your browser at: `http://localhost:3000`

---

## 📄 License & Attribution

Designed and engineered for **Serenity Salon & Spa Management ERP SaaS**.  
Built with natural tones UI aesthetic, Ethiopian Birr (ETB) localization, single-database multi-tenancy, and live XAMPP MySQL backend integration.
