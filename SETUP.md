# Saajha Setup & Integration Guide

Welcome! This guide outlines the exact, step-by-step procedure to connect the Saajha application to your Supabase project (`saajha` · reference: `vpggwcgfvxviumbjelbs`).

---

## Step 1: Configure Environment Variables

Create or open `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vpggwcgfvxviumbjelbs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!IMPORTANT]
> **Use the standard JWT `anon` key, not the publishable key:**
> 1. Open your browser to the Supabase Dashboard:
>    **[https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/settings/api](https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/settings/api)**
> 2. In **Project Settings &rarr; API &rarr; Project API keys**:
> 3. Copy the key labeled **`anon` / `public`** (a long JSON Web Token starting with `eyJhbGciOi...`).
> 4. *Do not use an `sb_publishable_...` key* — PostgREST requires the standard JWT token format to extract the PostgreSQL `anon` role.
> 5. **Security**: `.env.local` is listed in `.gitignore` and must **never** be committed or shared.

---

## Step 2: Apply the Canonical Database Setup

The canonical setup file is [`supabase/combined_setup.sql`](./supabase/combined_setup.sql). It consolidates all 3 migration files, seed data, and demo auth accounts in exact dependency order:

1. `20261030000001_initial_schema.sql` (Extensions, Enums, Tables, GiST range exclusion constraint)
2. `20261030000002_functions_and_triggers.sql` (Audit Ledger, RPC functions, schema-routing, execution grants)
3. `20261030000003_rls_policies.sql` (Row Level Security for all tables)
4. `seed.sql` (NIT Warangal demo equipment, institutions, badges, schedules)
5. `create_auth_users.sql` (Supabase Auth accounts with `@saajha.org` emails and password `Demo@1234`)

### Safe Execution Procedure:
1. Open the Supabase SQL Editor in your browser:
   **[https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/sql/new](https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/sql/new)**
2. In your code editor, open [`supabase/combined_setup.sql`](./supabase/combined_setup.sql).
3. Copy the full content, paste it into the SQL Editor, and click **Run**.
4. **Safety Guarantee**: The script is idempotent. It uses `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `ON CONFLICT DO UPDATE`. Running it will **not** reset or drop existing tables or data.
5. Expected result: `Success. No rows returned` (completes in 2–4 seconds).

---

## Step 3: Run the Verification Test Suite

To verify that the database functions, exclusion constraints, RLS policies, and SHA-256 audit ledger are operational at the database level:

1. In the Supabase SQL Editor, click **+ New query**.
2. Open [`supabase/verification_tests.sql`](./supabase/verification_tests.sql) in your editor.
3. Copy all text, paste it into the SQL Editor, and click **Run**.
4. **Expected Success Output**:
   ```text
   >>> [TEST 1] Testing Access-Readiness failure for missing badge...
     Passed: Missing badge blocked with message: Missing: PRINTER_3D.
   >>> [TEST 2] Testing successful request for verified student with badges...
     Passed: Booking requested with ID ...
   >>> [TEST 3] Testing unauthorized approval rejection...
     Passed: Unauthorized approval blocked with error: ...
   >>> [TEST 4] Testing owner rejection requiring a mandatory reason...
     Passed: Empty reason rejection blocked: ...
   >>> [TEST 5] Testing valid owner approval...
     Passed: Booking approved by lab in-charge.
   >>> [TEST 6] Testing Exclusion Constraint against double-booking...
     Passed: PostgreSQL exclusion constraint blocked double booking (23P01 exclusion_violation).
   >>> [TEST 7] Testing equipment check-out with condition report...
     Passed: Check-out recorded with condition report ID ...
   >>> [TEST 8] Testing equipment return with condition report...
     Passed: Return recorded with condition report ID ...
   >>> [TEST 9] Verifying cryptographic SHA-256 audit ledger integrity...
     Passed: All 4 audit events verified intact.
   =======================================================
   ALL 9 SAAJHA VERIFICATION TESTS COMPLETED SUCCESSFULLY!
   =======================================================
   ```
5. *(The test suite automatically deletes its temporary test booking, incident, condition report, and notification, leaving your catalog pristine).*

> [!NOTE]
> Database verification tests validate schema constraints and security-definer RPCs directly within PostgreSQL. Complete end-to-end verification across the Next.js browser UI, real session cookies, and Supabase client state is evaluated separately during browser walkthroughs.

---

## Step 4: Troubleshooting

If an SQL error occurs in the SQL Editor:
- **`function digest(...) does not exist`**: Ensure `combined_setup.sql` was run completely. Migration 001 and 002 declare compatibility wrappers routing to `extensions.digest(...)` with UTF-8 bytea conversion.
- **`function ... in schema cache`**: PostgREST cache has not updated yet. Run `NOTIFY pgrst, 'reload schema';` in the SQL Editor, or wait 10 seconds.
- **Emergency Recovery (clean_reset.sql)**: If your database was corrupted by partial manual experimentation, [`supabase/clean_reset.sql`](./supabase/clean_reset.sql) is available to cleanly drop application tables and demo users before re-applying `combined_setup.sql`. **Do not run `clean_reset.sql` during routine updates** — it is strictly for emergency recovery.

---

## Step 5: Start Saajha & Run End-to-End Tests

1. Start the local server:
   ```powershell
   npm.cmd run dev
   ```
2. Open **[http://localhost:3000/login](http://localhost:3000/login)** in your browser.
3. Sign in via either:
   - One-click demo roles (e.g. Student, Owner, Manager, Admin).
   - Institute Supabase Auth form using email `student@saajha.org` (or `owner@saajha.org`, `admin@saajha.org`) with password `Demo@1234`.
4. **End-to-End Booking Lifecycle Test**:
   - Go to `/explore` &rarr; click **Prusa MK4 3D Printer**.
   - Pick an open slot &rarr; verify the **Access-Readiness Check** evaluates live rules.
   - Enter a purpose &rarr; click **Request access**.
   - Switch role to **Owner** &rarr; open `/owner` &rarr; approve the booking.
   - Switch back to **Student** &rarr; open `/bookings` &rarr; click **Check Out** &rarr; submit condition report.
   - When finished, click **Return Equipment** &rarr; submit return condition.
   - Open `/admin` &rarr; click **Verify Ledger Integrity** &rarr; confirm all SHA-256 links verify intact.
