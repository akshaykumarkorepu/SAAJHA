# Saajha · साझा

**Idle labs, shared with trust.**

Saajha lets NIT Warangal labs and clubs safely share idle equipment and rooms. Before anyone can request a resource, Saajha runs an **Access-Readiness Check** that shows exactly which rules they meet, which they don't, and how to fix it. Busy slots go to an explainable waitlist rather than whoever clicks fastest.

- **Live demo:** https://saajha-campus.vercel.app
- **Hackathon:** Code Conqueror India 2026
- **Team CTRL + AI:** Akshay Kumar Korepu (Backend + AI) · Ragula Thirumal (Frontend + UI)

> **Current status:** The application codebase includes the full UI, Supabase client/server integration, database schema, security-definer RPCs, and verification test scripts. When unconfigured or before remote migrations run, the app operates in offline mock/demo mode. Live database persistence is activated once remote Supabase migrations and Auth users are initialized. See [What works today](#what-works-today) and [Known gaps](#known-gaps--next-steps) below.

---

## Try it in two minutes

No sign-up required for the preview. Open https://saajha-campus.vercel.app/login and pick a demo role (operates in mock mode until remote Supabase migrations are applied, or sign in via the Supabase Auth form once accounts are provisioned).

| Demo role | Fictional user | What to try |
|---|---|---|
| **Student** | Aarav Reddy | Has every badge. Open the **Canon EOS 90D DSLR Kit**; all 8 readiness checks pass and **Request access** glows. |
| **Student 2** | Diya Sharma | Missing the 3D-printer badge. Open the **Prusa MK4 3D Printer** to see the badge check fail, with a "how to fix" link. |
| **Partner college** | Karthik Rao (Kakatiya Institute) | Sees only the 3 resources shared with partner colleges, and every request needs approval and supervision. |
| **Owner / Manager / Admin** | Lab in-charge, dept admin, admin | Role-specific consoles implemented in code (`/owner`, `/manager`, `/admin`); live database workflows activate once remote migrations are executed. |

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
| Landing page with animated "idle → shared" illustration, how-it-works, trust examples | ✅ Done |
| Login with 6 one-click demo roles, role switcher, sign-out | ✅ Done (mock session in `localStorage`; Supabase Auth attempt when configured) |
| Direct email & password Supabase Auth login form (`/login`) | ✅ Implemented in code (requires remote Auth user setup) |
| App shell: role-based nav, notification bell, theme toggle, mobile menu | ✅ Done |
| Discovery: search, category filters with counts, date filter, need box, resource cards | ✅ Done (need box uses keyword matching for now, labelled as such) |
| Resource detail: overview, rules, opening hours, booked slots, slot picker | ✅ Done |
| **Access-Readiness Check** (all 8 checks from the spec) | ✅ Done in client data layer & implemented as Postgres RPC `readiness_check()` |
| Explainable waitlist position and priority score | ✅ Done (calculated in UI & RPC) |
| Partner-college visibility rules | ✅ Done (in UI & RLS policies) |
| Loading skeletons, empty states, error + retry states | ✅ Done |
| Light and dark themes, reduced-motion support, keyboard focus, 360 px mobile | ✅ Done |
| Supabase schema, RLS policies, `security definer` RPCs, range exclusion constraint | ⚙️ Implemented in code (`supabase/migrations/`); remote migrations pending |
| Real Supabase Auth integration (`@supabase/ssr`, login/logout handlers) | ⚙️ Implemented in code; live authentication pending remote database & user setup |
| Owner approvals (`/owner`), My Bookings dashboard (`/bookings`), booking detail timeline (`/bookings/[id]`) | ⚙️ Implemented in code (dual-engine: mock fallback + Supabase RPCs); live workflow pending remote DB |
| Equipment check-out & return with condition reports & Before/After comparison | ⚙️ Implemented in code (`check_out`, `return_booking` RPCs); live workflow pending remote DB |
| Incidents + manager review (`/manager`), Skill Passport (`/passport`) | ⚠️ Functional UI routes with simulated badge requests & incident queue; full backend sync in progress |
| Cryptographic hash-chained audit ledger (`/admin`) with "Verify integrity" RPC | ⚙️ Implemented in code (`verify_ledger` SHA-256 RPC & mock engine); live DB verification pending |
| AI semantic matching, condition diff photo automation, and AI incident summaries | ⏳ Planned / Not implemented (advisory keywords and manual condition inspection used today) |

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
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL, RLS, Auth): schema migrations, RPCs, and client/server helpers implemented in code; remote database initialization pending

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
```

For offline preview, no environment variables are required (runs in client-side mock mode). To connect your real Supabase project, configure `.env.local` (never committed) and apply the migrations:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

See [`SETUP.md`](SETUP.md) for the complete, step-by-step database setup procedure.

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

- **Remote Supabase database initialization pending:** Schema migrations, RLS policies, and RPC functions are implemented under `supabase/migrations/`, but have not yet been executed against the remote Supabase project. The application currently defaults to local mock persistence until remote migrations and seed data are applied via the Supabase SQL Editor (see [`SETUP.md`](SETUP.md)).
- **Demo Auth user setup:** Real Supabase Auth login handlers are integrated in code; live password authentication requires running `supabase/create_auth_users.sql` or provisioning accounts in the Supabase Dashboard.
- **AI features are advisory / planned:** Describe-what-you-need currently uses keyword filtering; automated condition-diff inspection and AI incident summaries are planned for future releases.
- **Cross-browser & device verification:** Tested in modern Chrome and Edge desktop views; further touch-device, Safari, and Firefox validation is planned.

## Disclosure

Built with Next.js, Supabase, shadcn/ui, Base UI, Tailwind CSS, Motion, Sonner and lucide-react. An LLM API is planned for advisory AI features. **Claude Code** was used during development. All people, bookings and data in the demo are fictional.
