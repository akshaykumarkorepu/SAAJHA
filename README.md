# Saajha · साझा

**Idle labs, shared with trust.**

Saajha lets NIT Warangal labs and clubs safely share idle equipment and rooms. Before anyone can request a resource, Saajha runs an **Access-Readiness Check** that shows exactly which rules they meet, which they don't, and how to fix it. Busy slots go to an explainable waitlist rather than whoever clicks fastest.

- **Live demo:** https://saajha-campus.vercel.app
- **Hackathon:** Code Conqueror India 2026
- **Team CTRL + AI:** Akshay Kumar Korepu (Backend + AI) · Ragula Thirumal (Frontend + UI)

> **Prototype status:** the interface runs end to end on **fictional mock data** in the browser. The Supabase backend (database rules, auth, audit ledger) is the next build step. See [What works today](#what-works-today) and [Known gaps](#known-gaps--next-steps) below.

---

## Try it in two minutes

No sign-up. Open https://saajha-campus.vercel.app/login and pick a demo role.

| Demo role | Fictional user | What to try |
|---|---|---|
| **Student** | Aarav Reddy | Has every badge. Open the **Canon EOS 90D DSLR Kit**; all 8 readiness checks pass and **Request access** glows. |
| **Student 2** | Diya Sharma | Missing the 3D-printer badge. Open the **Prusa MK4 3D Printer** to see the badge check fail, with a "how to fix" link. |
| **Partner college** | Karthik Rao (Kakatiya Institute) | Sees only the 3 resources shared with partner colleges, and every request needs approval and supervision. |
| **Owner / Manager / Admin** | Lab in-charge, dept admin, admin | Role-specific navigation; their consoles are the next build (see below). |

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
| Login with 6 one-click demo roles, role switcher, sign-out | ✅ Done (mock session in `localStorage`) |
| App shell: role-based nav, notification bell, theme toggle, mobile menu | ✅ Done |
| Discovery: search, category filters with counts, date filter, need box, resource cards | ✅ Done (need box uses keyword matching for now, labelled as such) |
| Resource detail: overview, rules, opening hours, booked slots, slot picker | ✅ Done |
| **Access-Readiness Check** (all 8 checks from the spec) | ✅ Done, computed in `src/lib/data.ts` (mock of the future `readiness_check()` RPC) |
| Explainable waitlist position and priority score | ✅ Done (shown, not yet persisted) |
| Partner-college visibility rules | ✅ Done |
| Loading skeletons, empty states, error + retry states | ✅ Done |
| Light and dark themes, reduced-motion support, keyboard focus, 360 px mobile | ✅ Done |
| Supabase schema, RLS, `security definer` RPCs, real auth | ⏳ Next |
| Owner approvals, My bookings, check-out / return with condition reports | ⏳ Next (routes exist as "Coming in the next build") |
| Incidents + manager review, Skill Passport, badge issuing | ⏳ Next |
| Hash-chained audit ledger with "Verify integrity", fairness dashboard | ⏳ Next |
| AI matching, condition diff, incident summary (advisory only) | ⏳ Next |

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

In the planned backend the same checks run again **on the server** inside `request_booking()`, and a Postgres exclusion constraint makes double booking impossible, regardless of the UI.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript, Cache Components) on **Vercel**
- **Tailwind CSS 4** + **shadcn/ui** (Base UI primitives) + **lucide-react** icons
- **Motion** (`motion/react`) for state-change animation; CSS for entrances and scroll reveals
- **Sonner** for toasts
- Fonts: Fraunces (display), Inter (UI), JetBrains Mono (data) via `next/font`
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`): installed, wiring is the next step

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

No environment variables are needed yet. When the backend lands, these will be set in Vercel and `.env.local` (never committed):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Project structure

```
src/
  app/
    page.tsx                 Landing page
    login/                   Demo-role picker
    (app)/                   Signed-in pages (gated on the demo session)
      explore/               Discovery
      resources/[id]/        Resource detail + readiness check
      bookings, passport, owner, manager, admin/   Placeholders for the next build
  components/
    landing/                 Header, hero illustration
    explore/                 Explorer, resource card, need box
    resource/                Detail page, slot picker, readiness panel
    shell/                   App shell, nav, bell, session gate
    saajha/                  Shared: logo, status chip, empty/error states, skeletons, theme, reveal
    ui/                      shadcn/ui components
  lib/
    types.ts                 Row types matching the planned Postgres schema
    data.ts                  The only data-access layer (async; becomes Supabase RPC calls)
    mock.ts                  Fictional seed data (only data.ts imports it)
    motion.ts                Shared timing, easing and variants
    slots.ts                 Slot maths and formatting
```

UI components never import `mock.ts` directly, so swapping in Supabase only touches `src/lib/data.ts`.

## Design

The design system lives in [`DESIGN.md`](DESIGN.md): indigo for trust, marigold for the moment of sharing, warm paper in light mode and deep navy in dark mode. Motion explains state changes (readiness checks resolving, a failed check shaking once, the request button glowing when you're ready) and respects `prefers-reduced-motion`. Content stays visible without JavaScript.

The full product spec is in [`CLAUDE.md`](CLAUDE.md).

## Known gaps & next steps

- **No backend yet.** Requests, waitlist joins and role sessions are mocked in the browser and reset on reload.
- Some landing copy (hash-chained history, database-level double-booking guard, insert-only condition reports) describes the planned backend, which isn't built yet.
- The need box uses keyword matching; the AI version comes after the core flow.
- Not yet tested on real touch devices or in Safari and Firefox.

## Disclosure

Built with Next.js, Supabase (planned), shadcn/ui, Base UI, Tailwind CSS, Motion, Sonner and lucide-react. An LLM API is planned for advisory AI features. **Claude Code** was used during development. All people, bookings and data in the demo are fictional.
