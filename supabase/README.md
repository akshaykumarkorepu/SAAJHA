# Saajha Supabase & Backend Setup Guide

This directory contains the PostgreSQL migrations, database functions, RLS policies, seed data, and automated test suite for the **Saajha Campus Resource Platform**.

---

## 1. Migration Structure

Run migrations in order:

1. `migrations/20261030000001_initial_schema.sql`
   - Extensions: `btree_gist`, `pgcrypto`
   - Custom enums: roles, categories, statuses, condition stages, etc.
   - Core tables: `institutions`, `profiles`, `badges`, `user_badges`, `resources`, `resource_badges`, `availability_windows`, `bookings`, `waitlist_entries`, `condition_reports`, `incidents`, `notifications`, `audit_events`
   - Range exclusion constraint: Prevents overlapping bookings (`btree_gist` constraint on `(resource_id WITH =, slot WITH &&) WHERE status IN ('approved', 'checked_out')`).

2. `migrations/20261030000002_functions_and_triggers.sql`
   - `record_audit_event()`: Hash-chained tamper-evident event logger with SHA-256
   - `verify_ledger()`: Recomputes and verifies the hash chain integrity from Genesis
   - `readiness_check()`: Server-side validation of the 8 Access-Readiness rules
   - `request_booking()`: Server-side booking creation & waitlist placement
   - `decide_booking()`: Owner/admin approve or reject (mandatory written reason required for rejection)
   - `check_out()`: Records check-out condition report and moves status to `checked_out`
   - `return_booking()`: Records return condition report and moves status to `returned` (auto-creates incident if damaged)

3. `migrations/20261030000003_rls_policies.sql`
   - Zero-trust Row Level Security (RLS) policies on all tables
   - Protects append-only audit ledger and condition reports

4. `seed.sql`
   - Fictional NIT Warangal demo profiles, badges, equipment, and initial schedules matching `CLAUDE.md §10`.

---

## 2. Setup Instructions

### Option A: Using the Supabase Dashboard SQL Editor (Fastest)

1. Go to your Supabase Project: `https://supabase.com/dashboard/project/<your-project-ref>`.
2. Open the **SQL Editor** from the left navigation bar.
3. Paste and run each migration in order:
   - `migrations/20261030000001_initial_schema.sql`
   - `migrations/20261030000002_functions_and_triggers.sql`
   - `migrations/20261030000003_rls_policies.sql`
   - `seed.sql`
4. Run the automated test script to verify:
   - Paste `verification_tests.sql` and run. You should see `ALL 9 SAAJHA VERIFICATION TESTS COMPLETED SUCCESSFULLY!`.

### Option B: Using the Supabase CLI

```bash
# Link project
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push

# Apply seed data
supabase db execute --file supabase/seed.sql
```

---

## 3. Supabase Auth Users Setup

To allow email/password logins with the fictional demo identities, create users in **Authentication -> Users** in the Supabase Dashboard:

| Email | Role | Profile ID | Initial Password |
|---|---|---|---|
| `student@saajha.demo` | Student | `00000000-0000-4000-a000-000000000101` | `Demo@1234` |
| `student2@saajha.demo` | Student 2 | `00000000-0000-4000-a000-000000000102` | `Demo@1234` |
| `partner@saajha.demo` | Partner | `00000000-0000-4000-a000-000000000103` | `Demo@1234` |
| `owner@saajha.demo` | Owner | `00000000-0000-4000-a000-000000000104` | `Demo@1234` |
| `manager@saajha.demo` | Manager | `00000000-0000-4000-a000-000000000105` | `Demo@1234` |
| `admin@saajha.demo` | Admin | `00000000-0000-4000-a000-000000000106` | `Demo@1234` |

---

## 4. Environment Variables

Set these in your local `.env.local` and in **Vercel Project Settings -> Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

