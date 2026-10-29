# Saajha Setup Guide (Hackathon Quickstart)

Welcome! This guide outlines the exact, step-by-step procedure to connect the local Saajha application to your Supabase project (`saajha` · reference: `vpggwcgfvxviumbjelbs`).

---

## Step 1: Add Your Supabase JWT Anon Key to `.env.local`

Ensure `.env.local` has your project URL and the **JWT `anon` key**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vpggwcgfvxviumbjelbs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Important: Copy the JWT Key, Not the Publishable Key
1. Open your browser to your Supabase Dashboard:
   **[https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/settings/api](https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/settings/api)**
2. In **Project Settings &rarr; API**:
3. Look under **Project API keys** (or **Legacy API keys**).
4. Locate the key labeled **`anon` / `public`**.
   - **Correct Key Format**: A long JSON Web Token starting with `eyJhbGciOi...` (contains two dots `.`).
   - *Note*: If you use an `sb_publishable_...` key instead of the JWT `anon` key, PostgREST will reject requests with `Invalid API key` or `Secret API key required`.
5. Copy the `anon` `public` key (`eyJ...`) and paste it into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
6. Save `.env.local`.

---

## Step 2: Run Database Setup (One Click)

You do **not** need the Supabase CLI or database passwords. You can execute the entire setup directly in the Supabase **SQL Editor**:

1. Open the Supabase SQL Editor in your browser:
   **[https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/sql/new](https://supabase.com/dashboard/project/vpggwcgfvxviumbjelbs/sql/new)**
2. Open [`supabase/combined_setup.sql`](./supabase/combined_setup.sql) in your code editor.
3. Copy all text, paste it into the Supabase SQL Editor query box, and click **Run**.
   - *This sets up all 13 tables, custom enums, the `btree_gist` range exclusion constraint, security definer RPC functions, RLS policies, NIT Warangal demo equipment, and Supabase Auth accounts with password `Demo@1234`.*
4. It should complete in a few seconds with `Success. No rows returned`.

---

## Step 3: Run Verification Tests

To verify that the database functions, exclusion constraints, and cryptographic audit ledger are 100% operational:

1. In the Supabase SQL Editor, click **+ New query**.
2. Open [`supabase/verification_tests.sql`](./supabase/verification_tests.sql) in your editor.
3. Copy all text, paste it into the SQL Editor, and click **Run**.
4. Confirm the test output displays:
   ```text
   ALL 9 SAAJHA VERIFICATION TESTS COMPLETED SUCCESSFULLY!
   ```
   *(The test suite automatically cleans up its test records, leaving your demo equipment and profiles pristine).*

---

## Step 4: Recovery Procedure (If Ever Needed)

If an execution was previously interrupted or you ever need to reset application state:
1. Open [`supabase/clean_reset.sql`](./supabase/clean_reset.sql).
2. Paste and run it in the SQL Editor. It drops only Saajha's application tables and demo users, leaving platform extensions and system schemas completely safe.
3. Then rerun [`supabase/combined_setup.sql`](./supabase/combined_setup.sql).

---

## Step 5: Start Saajha

Run the Next.js development server:
```powershell
npm.cmd run dev
```
Open **[http://localhost:3000/login](http://localhost:3000/login)**:
- Click any demo role card to sign in directly with real Supabase Auth sessions.
- Or use the **Institute Supabase Auth Sign-In** form to sign in using `student@saajha.demo` with password `Demo@1234`.
