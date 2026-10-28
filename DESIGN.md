# Saajha — Design System & Motion Guide

> Every page must follow this file. The vibe: **"a trusted campus institution that feels alive."**
> Calm, precise and warm, like a well-run lab that also has an Indian soul. No generic SaaS gradients, no AI-slop purple glow.

## 1. Brand
- **Name:** Saajha (साझा, "shared, jointly owned")
- **Tagline:** Idle labs, shared with trust.
- **Personality:** trustworthy · fair · precise · warm · alive
- **Logo:** wordmark "Saajha" in the display font + a small mark: two overlapping rounded squares (two parties sharing one thing), in indigo and marigold. Build it as an inline SVG component `<Logo />`.

## 2. Color tokens (CSS variables, light + dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#14162B` | `#ECEDF5` | primary text |
| `--paper` | `#FAF8F3` (warm off-white) | `#0E1020` | page background |
| `--surface` | `#FFFFFF` | `#161936` | cards |
| `--line` | `#E7E3DA` | `#272B4D` | borders |
| `--muted` | `#6B6F86` | `#9A9EBB` | secondary text |
| `--indigo` (primary, trust) | `#2B3A8C` | `#7C8CF0` | buttons, links, focus |
| `--marigold` (accent, warmth) | `#F2A531` | `#F5B54F` | highlights, the "shared" moment, badges |
| `--success` | `#1F8A5B` | `#3CC38A` | readiness pass, approved, returned |
| `--warning` | `#C77B12` | `#E6A23C` | waitlisted, overdue |
| `--danger` | `#C2412D` | `#EF6A55` | rejected, damage |

Map these to the shadcn/ui theme variables. Use marigold sparingly: it is the "moment of sharing" color.

## 3. Typography
- **Display / headings:** `Fraunces` (Google Font, via `next/font`), weight 600, slightly tight letter-spacing. For the hero, product name and page titles.
- **UI / body:** `Inter` (or `Geist Sans`), 14–16px body, 1.5 line-height.
- **Data / IDs / timestamps / hashes:** `JetBrains Mono` (or `Geist Mono`).
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64.

## 4. Layout & components
- 8px spacing grid. Max content width 1200px. Generous whitespace.
- Radius: cards `16px`, buttons and inputs `10px`, chips `999px`.
- Cards: `--surface`, 1px `--line` border, very soft shadow (`0 1px 2px rgba(20,22,43,.04), 0 8px 24px rgba(20,22,43,.06)`). On hover: lift 2px + slightly stronger shadow.
- Subtle background texture on the landing page: a faint dot grid or blueprint grid (lab feel) using CSS, ~4% opacity.
- **Status chips** (used everywhere, one shared `<StatusChip status>` component):
  requested (indigo outline) · waitlisted (warning) · approved (success) · checked_out (indigo filled) · returned (success outline) · overdue (warning filled) · rejected (danger) · cancelled (muted) · completed (success filled)
- Icons: `lucide-react` only, 1.75 stroke.
- Category icons: Fabrication → `Printer`/`Cog`, Test & Measurement → `Activity`, Media → `Camera`, Spaces → `DoorOpen`.
- Empty states always have an icon, one friendly line and a primary action. Never a blank page.
- Loading uses skeletons, not spinners.
- Toasts (sonner) for every action result, written in plain language: "Request sent to the Electronics Lab in-charge".

## 5. Motion (use the `motion` package, i.e. framer-motion)
Motion must **explain state changes**, not decorate. Durations of 150–400ms; easing `[0.22, 1, 0.36, 1]`. Wrap everything in `MotionConfig reducedMotion="user"`.

**Signature moments (these make judges remember the product):**
1. **Access-Readiness Check** ⭐: the checks run one by one (~120ms stagger). Each row shows a small spinner → then an animated ✓ (green path draw) or ✗ (red), with the message sliding in. When all pass, the "Request access" button glows marigold briefly. If something fails, the row gently shakes once and shows the fix ("Get the 3D Printer Trained badge →").
2. **Hero "idle → shared" animation** on the landing page: a grid of equipment icons starting grey and dim (idle), which light up one by one in indigo and marigold, with thin animated lines connecting them to student avatars (shared). Loops slowly and is subtle.
3. **Booking timeline:** a vertical line that draws itself downward, with events appearing in sequence and icons popping in (scale 0.8 → 1). Hash values are shown in mono, truncated, with a copy button.
4. **Status change:** when a booking moves state (e.g. approved), the status chip morphs (`layoutId`) and a short marigold confetti-dot burst plays for approvals and successful returns only.
5. **Handover (check-out/return):** a two-column "Before / After" condition card that slides together for the comparison view.

**General motion:**
- Page transitions: fade + 8px rise.
- Lists and cards: staggered fade-up on first load (40ms stagger, max 8 items animated).
- Buttons: press scale 0.98; hover lift.
- Numbers on dashboards: count-up on first view.
- Notification bell: small wiggle when a new notification arrives.
- No infinite bouncing, no parallax overload, no animation blocking interaction.

## 6. Voice & copy
- Plain, human, explanatory. Always say **why**.
  - ✅ "You're #2 on the waitlist. You've had fewer bookings recently, so you moved up one place."
  - ❌ "Request status: WAITLISTED"
- Every rejection or blocked action shows the reason and the next step.
- AI outputs always carry a small label: `✦ AI suggestion · a person makes the final call`.

## 7. Accessibility (counts toward Usability)
- WCAG AA contrast, visible focus rings (indigo, 2px offset), keyboard navigable, `aria-live` for readiness results and toasts, labels on every input, works at 360px width.
