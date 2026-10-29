# Saajha Setup Guide (Hackathon Quickstart)

Welcome! This guide outlines the exact, step-by-step procedure to connect the local Saajha application to your Supabase project (`saajha`).

---

## Step 1: Add Your Supabase Anon Key to `.env.local`

We have already created `.env.local` and populated your project URL:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vpggwcgfvxviumbjelbs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Where to find your key:
1. Open your browser and go to the Supabase Dashboard:  
   **[https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs](https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs)**
2. In the left-hand navigation sidebar, click the **Settings (gear icon)** at the bottom-left.
3. Click on **API** (under *Project Settings*).
4. Under **Project API keys**, locate the key labeled **`anon` / `public`**.
5. Click the **Copy** button.
6. Open `.env.local` in this repository and paste the copied key next to `NEXT_PUBLIC_SUPABASE_ANON_KEY=`:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
7. Save the file.

> **Note:** Never share or paste the `service_role` (secret) key into browser-facing files.

---

## Step 2: Apply the Database Migrations

You do not need to install or configure CLI tools. You can apply the schema directly using the Supabase **SQL Editor**:

1. In the Supabase Dashboard sidebar, click the **SQL Editor** icon (represented by `>_`).
2. Click **+ New query**.
3. Copy and run the following files in order:

### 2.1 Initial Schema
- Open [`supabase/migrations/20261030000001_initial_schema.sql`](./supabase/migrations/20261030000001_initial_schema.sql).
- Copy all content, paste it into the SQL Editor, and click **Run**.
- *This sets up extensions (`btree_gist`, `pgcrypto`), 13 tables, custom enums, and the double-booking GiST exclusion constraint.*

### 2.2 Functions & Business Logic
- Open [`supabase/migrations/20261030000002_functions_and_triggers.sql`](./supabase/migrations/20261030000002_functions_and_triggers.sql).
- Copy all content, paste it into the SQL Editor, and click **Run**.
- *This configures the Access-Readiness validation engine, owner decision RPC, handover condition reports, and the SHA-256 hash-chained audit ledger.*

### 2.3 Row Level Security (RLS)
- Open [`supabase/migrations/20261030000003_rls_policies.sql`](./supabase/migrations/20261030000003_rls_policies.sql).
- Copy all content, paste it into the SQL Editor, and click **Run**.
- *This locks down all tables with zero-trust policies, restricting anonymous schedule views to calendar slots while preserving borrower identity privacy.*

---

## Step 3: Seed Demo Data & Auth Users

### 3.1 Demo Resources & Profiles
- Open [`supabase/seed.sql`](./supabase/seed.sql).
- Paste and click **Run**.
- *This populates fictional NIT Warangal profiles, badges, 3D printers, oscilloscopes, and lab spaces.*

### 3.2 Demo Auth Users (For instant login)
- Open [`supabase/create_auth_users.sql`](./supabase/create_auth_users.sql).
- Paste and click **Run**.
- *This creates matching Supabase Auth records for `student@saajha.demo`, `owner@saajha.demo`, `manager@saajha.demo`, and `admin@saajha.demo` with password `Demo@1234`.*

---

## Step 4: Run Verification Tests

To verify that the database functions, exclusion constraints, and audit ledger are 100% operational:
1. Open [`supabase/verification_tests.sql`](./supabase/verification_tests.sql).
2. Paste into the SQL Editor and click **Run**.
3. You should see the success output:
   ```text
   ALL 9 SAAJHA VERIFICATION TESTS COMPLETED SUCCESSFULLY!
   ```

---

## Step 5: Start Saajha

Run the Next.js development server:
```powershell
npm.cmd run dev
```
Open **[http://localhost:3000/login](http://localhost:3000/login)** in your browser:
- You can click any role card to sign in directly with real Supabase Auth sessions.
- Or use the **Institute Supabase Auth Sign-In** form to sign in using your email and password (`Demo@1234`).

