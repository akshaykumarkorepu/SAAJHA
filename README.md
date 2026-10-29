# Saajha · साझा

**Idle labs, shared with trust.**

Saajha lets NIT Warangal labs and clubs safely share idle equipment and rooms. Before anyone can request a resource, Saajha runs an **Access-Readiness Check** that shows exactly which rules they meet, which they don't, and how to fix it. Busy slots go to an explainable waitlist rather than whoever clicks fastest.

- **Live demo:** https://saajha-campus.vercel.app
- **Hackathon:** Code Conqueror India 2026
- **Team CTRL + AI:** Akshay Kumar Korepu (Backend + AI) · Ragula Thirumal (Frontend + UI)

> **Current status:** Saajha is a functional prototype featuring an implemented frontend, responsive application routes, Supabase database schema, security-definer RPCs, RLS policies, and Auth integration. Remote database setup on Supabase (`vpggwcgfvxviumbjelbs`) has been executed, and database-level verification tests have reportedly succeeded (as reported by user execution in the Supabase SQL Editor). Final browser-to-database end-to-end integration testing across real session cookies and interactive booking flows is scheduled for tomorrow's testing session. In unconfigured or offline mode, the application operates seamlessly with client-side demo and mock persistence. See [What works today](#what-works-today) and [Known gaps](#known-gaps--next-steps) below.

---

## Try it in two minutes

No sign-up required for previewing the interface. Open https://saajha-campus.vercel.app/login and select a demo persona. Note the distinction:
- **Client Mock / Demo Mode:** Select any of the 6 demo role cards to instantly preview role views and workflows using client-side simulated state.
- **Real Supabase Auth Session:** Expand the **Institute Supabase Auth Sign-In** form on `/login` to sign in with provisioned demo accounts (e.g. `student@saajha.org` with password `Demo@1234`) to test real session-backed database operations.
- **Browser-Level Verification:** Real browser-to-database interaction across all tabs and transitions will be confirmed during tomorrow's live testing session.

| Demo role | Fictional user | What to try |
|---|---|---|
| **Student** | Aarav Reddy | Has every badge. Open the **Canon EOS 90D DSLR Kit**; all 8 readiness checks pass and **Request access** glows. |
| **Student 2** | Diya Sharma | Missing the 3D-printer badge. Open the **Prusa MK4 3D Printer** to see the badge check fail, with a "how to fix" link. |
| **Partner college** | Karthik Rao (Kakatiya Institute) | Sees only the 3 resources shared with partner colleges, and every request needs approval and supervision. |
| **Owner / Manager / Admin** | Lab in-charge, dept admin, admin | Role-specific consoles implemented in code (`/owner`, `/manager`, `/admin`); database-level verification of RPCs has been executed. |

### Suggested walkthrough

1. **Landing (`/`):** watch the idle equipment light up and connect to students. Hover a tile to name it. Scroll to **Trust in practice**.
2. **Log in as Student** → `/explore`. Search "camera", try the category chips and the **Today / Tomorrow** filter, or type a need into **✦ Describe what you need**.
3. Open the **DSLR kit** → the readiness checks resolve one by one → add a purpose → **Request access** → you get a confirmation and a toast.
4. **Switch role → Student 2** (name chip, top right). Open the DSLR, pick **Tmrw → 2 PM**. The slot is already booked, so you're offered **Join waitlist (#1)** with your priority score explained line by line (100 − 10 + 18.4 + 0 = 108.4).
5. As **Student 2**, open the **3D printer**. "Required badges held" fails and shakes, with **Get the 3D Printer Trained badge →**.
6. **Switch to Partner college**: only partner-shared resources appear.
7. Toggle **dark mode**, and try it all at phone width.

---

## What works today

| Area | Status |
|---|---|
| Landing page, responsive UI, motion animations, light/dark themes | `Implemented` |
| Demo-role selection, role switching, and mock-mode preview | `Implemented` |
| Direct email & password Supabase Auth integration (`/login`) | `Implemented — live browser verification pending` |
| Resource discovery, search, category filters, and resource details | `Implemented` |
| Access-Readiness Check UI and `readiness_check()` database RPC | `Implemented — database verification reported successful` |
| Explainable waitlist position and priority scoring | `Implemented` |
| Partner-college visibility rules and RLS policy enforcement | `Implemented — database verification reported successful` |
| Loading skeletons, empty states, and recoverable error/retry states | `Implemented` |
| My Bookings dashboard and booking detail timeline (`/bookings/[id]`) | `Implemented — live browser verification pending` |
| Owner request queue, approval and rejection console (`/owner`) | `Implemented — database verification reported successful` |
| Equipment check-out, return, and condition reports with before/after view | `Implemented — database verification reported successful` |
| Manager supervision console (`/manager`) and Admin console (`/admin`) | `Implemented` |
| Skill Passport (`/passport`) and incident logging workflows | `Partially implemented` (functional UI routes with simulated queues) |
| SHA-256 hash-chained audit ledger and `verify_ledger()` RPC | `Implemented — database verification reported successful` |
| PostgreSQL constraints (`btree_gist` range exclusion), triggers, RLS policies | `Implemented — database verification reported successful` |
| Automated database verification test suite (`verification_tests.sql`) | `Implemented — database verification reported successful` (user-reported SQL Editor success) |
| AI semantic vector matching, automated photo-difference detection, AI summaries | `Planned` (advisory keywords and manual condition inspection used today) |

## The Access-Readiness Check

Every request is checked against eight rules. Each row says why it passed or failed and what to do next:

1. Verified institute member
2. Required training badges held (missing ones are named)
3. Within weekly credits ("needs 3, you have 6")
4. Active booking cap (max 2 upcoming)
5. Cooldown respected for high-demand items
6. Within max duration and opening hours
7. Slot free, or "join the waitlist, you'd be #N"
8. Approval / supervision notes (partner-college access always needs both)

Waitlist priority: `score = 100 − 10 × (bookings in last 14 days) + 0.2 × reliability + minutes waiting / 60`, ties broken first-come-first-served.

In the database implementation (`supabase/migrations/`), the same checks run **on the server** inside `request_booking()` and `readiness_check()`, and a PostgreSQL exclusion constraint (`no_double_booking` via `btree_gist`) makes concurrent double bookings impossible at the database level.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript, Cache Components) on **Vercel**
- **Tailwind CSS 4** + **shadcn/ui** (Base UI primitives) + **lucide-react** icons
- **Motion** (`motion/react`) for state-change animation; CSS for entrances and scroll reveals
- **Sonner** for toasts
- Fonts: Fraunces (display), Inter (UI), JetBrains Mono (data) via `next/font`
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL, RLS, Auth): schema migrations, security-definer RPCs, and client/server helpers. Remote setup executed; automated database verification tests reportedly passed in SQL Editor; browser-level verification scheduled for tomorrow.

## Run it locally

Requires Node.js 20+.

```bash
git clone https://github.com/akshaykumarkorepu/SAAJHA.git
cd SAAJHA
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build (also type-checks)
npm run start      # serve the production build
npm run lint       # ESLint
npm test           # Static SQL & ledger audit validation
```

For offline preview, no environment variables are required (runs in client-side mock mode). To connect your real Supabase project:
1. Configure `.env.local` (never committed to git) with your project URL and standard JWT `anon` key:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://vpggwcgfvxviumbjelbs.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
2. Apply [`supabase/combined_setup.sql`](supabase/combined_setup.sql) via the Supabase SQL Editor.
3. Run [`supabase/verification_tests.sql`](supabase/verification_tests.sql) to confirm all 9 assertions pass.
4. See [`SETUP.md`](SETUP.md) for the complete, step-by-step procedure.

## Project structure

```
src/
  app/
    page.tsx                 Landing page
    login/                   Demo-role picker & Supabase Auth sign-in
    (app)/                   Signed-in pages (gated on the session)
      explore/               Discovery
      resources/[id]/        Resource detail + readiness check
      bookings/              My Bookings dashboard + detail timeline ([id])
      owner/                 Owner request queue, approvals & rejection modal
      manager/               Supervision desk, badge queue & incident logs
      admin/                 Admin console & SHA-256 audit ledger verification
      passport/              Skill Passport credentials & certification upload
  components/
    landing/                 Header, hero illustration
    explore/                 Explorer, resource card, need box
    resource/                Detail page, slot picker, readiness panel
    bookings/                Handover & return condition report modal
    shell/                   App shell, nav, bell, session gate
    saajha/                  Shared: logo, status chip, empty/error states, skeletons, theme, reveal
    ui/                      shadcn/ui components
  lib/
    types.ts                 Row types matching the Supabase Postgres schema
    data.ts                  Dual-engine data-access layer (Supabase RPCs + mock fallback)
    mock.ts                  Fictional seed data (only data.ts imports it)
    motion.ts                Shared timing, easing and variants
    slots.ts                 Slot maths and formatting
    supabase/                Browser and server client helpers (@supabase/ssr)
supabase/
  migrations/                Versioned Postgres DDL, RPCs, GiST exclusion constraint & RLS
  seed.sql                   NIT Warangal demo equipment, profiles and badges
  create_auth_users.sql      Supabase Auth accounts helper (Demo@1234)
  verification_tests.sql     Automated 9-stage database verification test suite
  combined_setup.sql         Consolidated one-click setup script for Supabase SQL Editor
```

UI components never import `mock.ts` directly, so all data operations route through `src/lib/data.ts`.

## Design

The design system lives in [`DESIGN.md`](DESIGN.md): indigo for trust, marigold for the moment of sharing, warm paper in light mode and deep navy in dark mode. Motion explains state changes (readiness checks resolving, a failed check shaking once, the request button glowing when you're ready) and respects `prefers-reduced-motion`. Content stays visible without JavaScript.

The full product spec is in [`CLAUDE.md`](CLAUDE.md).

## Known gaps & next steps

- **Browser-to-database end-to-end testing:** While SQL migrations, RLS policies, RPCs, and automated database test assertions have reportedly completed in the Supabase SQL Editor, browser-level verification across real session cookies, the Access-Readiness Check on live data, and the full interactive booking lifecycle (request &rarr; owner approval &rarr; check-out &rarr; return) is scheduled for tomorrow's testing session.
- **Production Vercel deployment sync:** Confirming production environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) on Vercel and verifying live responses against `https://saajha-campus.vercel.app`.
- **AI features are advisory / planned:** Describe-what-you-need currently uses keyword filtering; automated condition-diff inspection and AI incident summaries are planned for future releases.
- **Cross-browser & device verification:** Tested in modern Chrome and Edge desktop views; further touch-device, Safari, and Firefox validation is planned.

## Disclosure

Built with Next.js, Supabase, shadcn/ui, Base UI, Tailwind CSS, Motion, Sonner and lucide-react. An LLM API is planned for advisory AI features. **Claude Code** was used during development. All people, bookings and data in the demo are fictional.
