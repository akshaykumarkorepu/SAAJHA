@AGENTS.md

# Saajha — Build Spec (drop this into the repo as `CLAUDE.md`)

> Name: **Saajha** (Hindi/Urdu: "shared, jointly owned"). Tagline: *Idle labs, shared with trust.*

> Hackathon: Code Conqueror India 2026. ONE 48-hour round.
> **Deadline: Fri 30 Oct 2026, 10:00 AM IST. Internal target: submit by 7:00 AM.**
> Team CTRL + AI — Akshay (Backend + AI) · Ragula Thirumal (Frontend + UI)

## 0. Golden rules for Claude Code
1. The **end-to-end journey must always work on the deployed URL**. Never break `main`.
2. Every business rule is enforced **in the database / server**, never only in the UI.
3. Every state change writes an `audit_events` row (DB trigger, not app code).
4. AI is **advisory only** and must fail gracefully. If the AI call fails, the app still works.
5. Commit small and often, with clear messages. Judges may check commit history.
6. Use only fictional demo data.

## 1. Product in one line
Saajha lets NIT Warangal labs and clubs safely share idle equipment and rooms. Before anyone can request a resource, it shows an **Access-Readiness Check**. Approvals are fair and explained, every handover is backed by condition evidence, and every action lands in a tamper-evident history.

Use case: **one institute**, 4 categories — Fabrication (3D printer), Test & Measurement (oscilloscope), Media (DSLR kit), Spaces (project room).

## 2. Official judging rubric → what proves it
| Criterion | Pts | Proof in product |
|---|---|---|
| Understanding of problem | 20 | Focused use case, readiness check, real survey numbers in PDF |
| Solution & whether it runs | 25 | Judge completes list → request → approve → check-out → return → history alone |
| Technical depth & reliability | 20 | DB-enforced state machine, exclusion constraint (no double booking), RLS, triggers, hash-chained audit |
| Originality | 15 | Access-Readiness Check, Skill Passport, explainable waitlist, AI condition diff |
| Usability & real-world fit | 12 | One-click demo logins, clear status chips, "why" messages, mobile responsive |
| Documentation & next steps | 8 | README + PDF + test script + known gaps |

## 3. Stack
- **Next.js 15 (App Router, TypeScript)** + Tailwind + shadcn/ui
- **Supabase**: Postgres, Auth (email/password), Storage (private bucket `condition-photos`), RLS
- Business logic as **Postgres functions called via `supabase.rpc()`** (`security definer`, check `auth.uid()` role inside)
- **Vercel** for hosting
- AI: one LLM API (Gemini / Claude), via a Next.js route handler, key server-side only

## 4. Roles
`student` (borrower) · `owner` (lab in-charge) · `manager` (dept admin: badges, incidents, penalties) · `admin` (everything + audit ledger)

## 5. Database schema
```
institutions(id, name, short_code)                       -- NITW (home) + 1 fictional partner college
profiles(id uuid pk = auth.users.id, full_name, email, role, institution_id, department, roll_no,
         verified bool, weekly_credits int default 10, reliability int default 100, created_at)

badges(id, code unique, name, description)               -- e.g. LAB_SAFETY_1, PRINTER_3D, SCOPE_BASIC
user_badges(user_id, badge_id, issued_by, issued_at, evidence_path, status: pending|active|revoked)

resources(id, owner_id, name, category: fabrication|test_measurement|media|space,
          description, location, image_url, requires_approval bool default true,
          requires_supervision bool, max_hours int, credit_cost int,
          cooldown_hours int default 0, usage_rules text,
          visibility: department|campus|partner default campus,   -- partner = shared with partner colleges (scale story)
          status: active|maintenance|suspended, created_at)
resource_badges(resource_id, badge_id)                   -- required badges
availability_windows(id, resource_id, weekday 0-6, start_time, end_time)

bookings(id, resource_id, borrower_id, starts_at timestamptz, ends_at timestamptz,
         slot tstzrange generated (starts_at, ends_at),
         purpose text, status booking_status, decision_reason text,
         decided_by, decided_at, created_at)
  -- EXCLUDE USING gist (resource_id WITH =, slot WITH &&)
  --   WHERE (status IN ('approved','checked_out'))      ← no double booking, ever (btree_gist)

waitlist_entries(id, resource_id, user_id, starts_at, ends_at, purpose,
                 priority_score numeric, position int, status: waiting|promoted|expired|left, created_at)

condition_reports(id, booking_id, stage: check_out|return, condition: excellent|good|fair|damaged,
                  checklist jsonb, notes, photo_paths text[], author_id, created_at)   -- never updated, only inserted

incidents(id, booking_id, type: damage|late_return|no_show|misuse|other, description,
          reported_by, ai_summary text, status: open|under_review|resolved|dismissed,
          resolution text, penalty_credits int default 0, reviewed_by, reviewed_at, created_at)

notifications(id, user_id, title, body, link, read bool, created_at)

audit_events(id bigserial, actor_id, action text, entity_type, entity_id,
             details jsonb, prev_hash text, hash text, created_at)   -- append-only (no UPDATE/DELETE via RLS + trigger)
```

### Booking state machine (enforced in `transition_booking()`)
```
requested ──(auto check fails)──► rejected (reason auto-written)
requested ──(slot taken)────────► waitlisted
requested ──(owner)─────────────► approved | rejected(reason required)
waitlisted ─(slot frees, top of queue)► requested (re-checked) 
approved ──(borrower/owner)─────► cancelled | checked_out (needs check_out condition report)
checked_out ──(borrower+owner)──► returned (needs return condition report)
checked_out ──(cron, past ends_at)► overdue  → still can go to returned
returned ───────────────────────► completed (no open incident) 
```
Any other transition → raise exception. Incidents are separate rows, so a booking can be `returned` while a damage incident is still open.

## 6. Core RPC functions (all `security definer`, validate `auth.uid()`)
- `readiness_check(resource_id, starts_at, ends_at)` → JSON list of checks, each `{key, label, passed, message}`:
  1. Verified institute member
  2. Required badges held (lists missing ones by name)
  3. Within weekly credits (needs X, has Y)
  4. Active booking cap (max 2 upcoming)
  5. Cooldown respected for high-demand resources
  6. Within resource's max duration and availability window
  7. Slot free (if not → "Join waitlist, you'd be #N")
  8. Needs owner approval / supervision (info)
- `request_booking(...)` → runs readiness_check **again server-side**, then creates `requested`, or `waitlisted` with position, or `rejected` with an auto reason.
- `decide_booking(booking_id, decision, reason)` → owner/manager only. Re-checks the conflict at approval time (the exclusion constraint is the final guard). Reason is mandatory for rejection.
- `check_out(booking_id, condition, checklist, notes, photos)` / `return_booking(...)`
- `cancel_booking(booking_id, reason)` → frees the slot → `promote_waitlist(resource_id, slot)`
- `report_incident(booking_id, type, description)` / `resolve_incident(id, resolution, penalty_credits)` (manager only)
- `issue_badge(user_id, badge_code)` / `revoke_badge` (manager only)
- **Waitlist priority score** (shown to the user with its breakdown):
  `score = 100 − 10×(bookings in last 14 days) + 0.2×reliability + minutes waiting/60`. Ties go to FIFO.

## 7. Audit ledger
- A trigger on bookings, condition_reports, incidents, user_badges and resources inserts into `audit_events`.
- `hash = sha256(prev_hash || actor || action || entity || details || created_at)` (pgcrypto).
- Admin page has a **"Verify integrity"** button that recomputes the chain and shows ✅ or the first broken row.

## 8. Pages
| Route | Who | What |
|---|---|---|
| `/login` | all | Email login + **4 one-click demo buttons** (Student / Owner / Manager / Admin) |
| `/` | all | Resource discovery: search, filters (category, dept, date), status chips. **"Describe what you need"** AI box |
| `/resources/[id]` | all | Details, rules, required badges, availability calendar, **Access-Readiness Check panel** for the chosen slot, Request / Join waitlist |
| `/bookings` | student | My bookings by status. Actions: cancel, check out, return, report issue |
| `/bookings/[id]` | parties + mgr | **Timeline from audit_events**, condition reports side by side (check-out vs return), AI condition diff, incidents |
| `/passport` | student | Skill Passport: badges held / pending, upload certificate |
| `/owner` | owner | My resources (create/edit/maintenance), request queue with readiness summary, approve/reject with reason, handover confirm |
| `/manager` | manager | Badge requests (AI pre-check note), incident queue (AI summary → resolve + penalty), overdue list |
| `/admin` | admin | Users and roles, audit ledger with integrity check, fairness dashboard (bookings per user and dept, utilisation) |
| bell icon | all | In-app notifications |

## 9. AI features (P2 — only after P0/P1 are done)
1. **Need → resource matching**: user free text → LLM gets the list of resources (name, category, rules) → returns top 3 ids + one-line reasons → UI shows cards. Fallback: keyword search.
2. **Condition diff**: check-out vs return notes and photos → "Possible new scratch on lens cap. Recommend owner inspection." → owner confirms or dismisses.
3. **Incident summary** for manager.
4. **Certificate pre-check**: does the uploaded doc mention the badge topic, the user's name and a valid date → note for the manager.
Every AI output is labelled "AI suggestion — a human decides" and stored in the audit details.

## 10. Seed data (fictional)
- Users: `student@saajha.demo`, `student2@saajha.demo` (missing PRINTER_3D badge), `owner@saajha.demo`, `manager@saajha.demo`, `admin@saajha.demo` — password `Demo@1234`
- Resources (8): Prusa 3D Printer (needs PRINTER_3D + LAB_SAFETY_1, supervision), Rigol Oscilloscope (SCOPE_BASIC), Canon DSLR Kit, Raspberry Pi 5 Kit, Seminar Hall B, Project Room 2, Soldering Station (LAB_SAFETY_1), Projector
- Pre-made bookings in every state, so dashboards and timelines aren't empty
- One conflicting slot on the DSLR for the waitlist demo
- Partner college "Kakatiya Institute (demo)" + `partner@saajha.demo` student: sees only `visibility = partner` resources; readiness check adds "Partner-college access: needs owner approval + supervision"

## 11. Priorities & timeline (now → Fri 10:00)
| Block (IST) | Goal | Owner |
|---|---|---|
| **Wed 2:30–4:00 PM** | Repo, Next.js + Supabase + Vercel deployed "hello", schema + RLS migration, seed users | Akshay |
| Wed 4:00–9:00 PM | **P0-a**: login + demo buttons, discovery, resource page, owner create/edit, readiness_check, request_booking | both |
| Wed 9 PM–Thu 2 AM | **P0-b**: owner approve/reject, check-out/return with condition reports, audit trigger, booking timeline. **Full journey on prod URL** ✅ | both |
| Thu 2–8 AM | Sleep in shifts (seriously) | — |
| Thu 8 AM–2 PM | **P1**: waitlist + auto-promote, caps/credits/cooldown, cancel, incidents + manager review, badges, notifications, overdue | both |
| Thu 2–8 PM | **P2**: AI matching + condition diff + incident summary, hash-chain + verify, fairness dashboard, polish UI | Akshay AI / Ragula UI |
| Thu 8 PM–Fri 1 AM | **Feature freeze 1 AM.** Full test script on prod as each role, fix bugs, mobile check | both |
| Fri 1–6 AM | README, official-format PDF, screenshots, testing notes. Sleep a bit | Ragula PDF / Akshay README |
| **Fri 6–8 AM** | Final check of links and access. **Both members submit the Google Form individually** | both |

If behind schedule, cut in this order: AI incident summary → certificate pre-check → hash chain → fairness dashboard. **Never cut P0.**

## 12. Judge test script (put in README + PDF)
1. Login **Owner** → create "Sony Mirrorless Kit" with rules → publish.
2. Login **Student** → search "camera" → open → pick slot → readiness check all green → request.
3. Login **Student 2** → same slot → readiness shows slot taken → join waitlist (#1, score shown).
4. Login **Student 2** → 3D printer → readiness shows ❌ missing badge "3D Printer Trained".
5. **Owner** → approve Student's request (try to approve a conflicting one → blocked with message).
6. **Student** → check out (condition "good" + photo) → return (condition "fair" + note "scratch") → AI flags difference.
7. **Student** → report damage → **Manager** reviews the AI summary → resolves with 2-credit penalty and a written reason.
8. Open booking → full timeline. **Admin** → audit ledger → Verify integrity ✅.

## 13. Definition of done (check before submission)
- [ ] Every step of §12 works on the **deployed URL** in an incognito window
- [ ] A student cannot approve via the API (test with a direct rpc call → error)
- [ ] Double booking impossible (two approvals for the same slot → second fails)
- [ ] Repo public (or judges have access), README complete, env var names only (no secrets)
- [ ] PDF in the official format, with completed vs unfinished features listed honestly
- [ ] Disclosure: Next.js, Supabase, shadcn/ui, LLM API, Claude Code used for development
- [ ] Both members submitted the Google Form individually, each with their own role and contribution
