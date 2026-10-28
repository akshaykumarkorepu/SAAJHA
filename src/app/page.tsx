import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  Fingerprint,
  Handshake,
  Printer,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroAnimation } from "@/components/landing/hero-animation";
import { HeroGlow } from "@/components/landing/hero-glow";
import { ReadinessDemo } from "@/components/landing/readiness-demo";
import { SiteFooter, SiteHeader } from "@/components/landing/site-header";
import { Reveal } from "@/components/saajha/reveal";
import { cn } from "@/lib/utils";

const STEPS: { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "List",
    body: "A lab in-charge lists the idle oscilloscope with its rules, badges and opening hours.",
    Icon: ClipboardList,
  },
  {
    title: "Check readiness",
    body: "Before you ask, Saajha shows exactly what you meet, what's missing, and how to fix it.",
    Icon: ScanSearch,
  },
  {
    title: "Approve fairly",
    body: "Owners decide with a written reason. Busy slots go to an explainable waitlist, not the fastest clicker.",
    Icon: Scale,
  },
  {
    title: "Hand over with evidence",
    body: "Condition and photos at check-out and return, so damage questions have answers.",
    Icon: Handshake,
  },
];

const DIFFERENT: {
  title: string;
  body: string;
  Icon: LucideIcon;
  tone: "indigo" | "marigold";
}[] = [
  {
    title: "Access-Readiness Check",
    body: "Eight checks run before you request, from training badges to credits, each with a plain reason and a next step.",
    Icon: BadgeCheck,
    tone: "marigold",
  },
  {
    title: "Fair allocation",
    body: "Weekly credits, booking caps, cooldowns and a waitlist score you can read line by line.",
    Icon: Scale,
    tone: "indigo",
  },
  {
    title: "Evidence-backed handover",
    body: "Before and after condition reports that are only ever added to, with an AI hint when something changed.",
    Icon: ShieldCheck,
    tone: "indigo",
  },
  {
    title: "Tamper-evident history",
    body: "Every approval, return and penalty is hash-chained, so one click can show nobody rewrote the past.",
    Icon: Fingerprint,
    tone: "marigold",
  },
];

// Static illustrations of the product, labelled as examples (fictional demo data).
const EXAMPLE_CHECKS: {
  label: string;
  note: string;
  pass: boolean;
  fix?: string;
}[] = [
  {
    label: "Verified institute member",
    note: "Diya Sharma · 23MEB0A27",
    pass: true,
  },
  {
    label: "Required badges held",
    note: "Missing: 3D Printer Trained",
    pass: false,
    fix: "Get the 3D Printer Trained badge",
  },
  {
    label: "Within weekly credits",
    note: "Needs 3, has 6 this week",
    pass: true,
  },
  { label: "Active booking cap", note: "0 of 2 upcoming", pass: true },
  { label: "Within opening hours", note: "2 h of 4 h max", pass: true },
];

const EXAMPLE_HISTORY = [
  {
    actor: "Aarav R.",
    action: "requested",
    detail: "Canon EOS 90D · Tomorrow 10 AM–12 PM",
    hash: "9f2c41d7",
    tone: "indigo",
  },
  {
    actor: "Dr. Lakshmi N.",
    action: "approved",
    detail: "“Club event, all checks passed.”",
    hash: "4b7e2a9c",
    tone: "success",
  },
  {
    actor: "Aarav R.",
    action: "checked out",
    detail: "Condition: good · 2 photos",
    hash: "c03d18e5",
    tone: "indigo",
  },
  {
    actor: "Aarav R.",
    action: "returned",
    detail: "Condition: fair · “scratch on lens cap”",
    hash: "71aa5f02",
    tone: "marigold",
  },
] as const;

function W(w: number) {
  return { "--w": w } as React.CSSProperties;
}

function I({ i }: { i: number }) {
  return { "--i": i } as React.CSSProperties;
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* ───────── Hero ───────── */}
        <section id="top" className="relative -mt-16 overflow-hidden pt-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="ambient absolute -inset-[10%] [animation:drift_45s_var(--ease-in-out)_infinite]"
              data-anim=""
            />
            <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-background" />
          </div>
          <HeroGlow />

          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:pt-20 lg:pb-28">
            <div>
              <p
                className="enter mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
                style={I({ i: 0 })}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-marigold opacity-60 motion-reduce:hidden [animation-duration:2.4s]" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-marigold" />
                </span>
                For NIT Warangal labs, clubs and partner colleges
              </p>

              <h1 className="text-display" aria-label="Idle labs, shared with trust.">
                <span aria-hidden="true">
                  <span className="word-rise" style={W(0)}>
                    Idle
                  </span>{" "}
                  <span className="word-rise" style={W(1)}>
                    labs,
                  </span>
                  <br />
                  <span className="word-rise text-indigo" style={W(2)}>
                    shared
                  </span>{" "}
                  <span className="word-rise" style={W(3)}>
                    with
                  </span>{" "}
                  <span className="word-rise relative" style={W(4)}>
                    trust.
                    <svg
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                      className="absolute -bottom-[0.06em] left-0 h-[0.14em] w-[88%] overflow-visible"
                    >
                      <path
                        d="M2 8 C 50 2, 120 2, 198 6"
                        fill="none"
                        stroke="var(--marigold)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray="1"
                        data-anim=""
                        className="[animation:draw_700ms_var(--ease-out)_820ms_both]"
                      />
                    </svg>
                  </span>
                </span>
              </h1>

              <p className="enter mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground" style={I({ i: 3 })}>
                Borrow the 3D printer, scope or seminar hall that sits unused down the corridor, with clear rules, fair
                approvals and a record everyone can trust.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/explore"
                  className={cn(buttonVariants({ size: "lg" }), "enter h-11 px-5 text-[15px]")}
                  style={I({ i: 4 })}
                >
                  Explore resources
                  <ArrowRight data-icon="inline-end" strokeWidth={1.75} />
                </Link>
                <Link
                  href="/login"
                  className={cn(buttonVariants({ size: "lg", variant: "outline" }), "enter h-11 px-5 text-[15px]")}
                  style={I({ i: 5 })}
                >
                  Try a demo role
                </Link>
              </div>

              <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
                {[
                  ["8", "readiness checks before every request"],
                  ["4", "resource categories"],
                  ["6", "demo roles to explore"],
                ].map(([n, label], i) => (
                  <div key={label} className="enter flex flex-col-reverse" style={I({ i: 6 + i })}>
                    <dt className="text-xs leading-snug text-muted-foreground">{label}</dt>
                    <dd className="tabular font-display text-3xl font-semibold tracking-tight">{n}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="enter-fade" style={I({ i: 3 })}>
              <HeroAnimation />
            </div>
          </div>
        </section>

        {/* ───────── Live readiness demo ───────── */}
        <section id="demo" className="relative border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-28">
            <Reveal>
              <p className="eyebrow">Try it without logging in</p>
              <h2 className="mt-3 max-w-2xl text-title">Ask for something. See exactly why you can, or can&apos;t.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Pick a person, a resource and a time. The real Access-Readiness Check runs on demo data, with a reason and
                a next step on every line.
              </p>
            </Reveal>
            <Reveal index={1} className="mt-12">
              <ReadinessDemo />
            </Reveal>
          </div>
        </section>

        {/* ───────── How it works ───────── */}
        <section id="how" className="relative border-t border-line bg-surface-2/40">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-28">
            <Reveal>
              <p className="eyebrow">How Saajha works</p>
              <h2 className="mt-3 max-w-xl text-title">From idle shelf to trusted handover, in four steps.</h2>
            </Reveal>
            <div className="relative mt-14">
              <Reveal
                data-reveal="line-x"
                aria-hidden="true"
                className="absolute top-6 right-[12%] left-[6%] hidden h-px bg-linear-to-r from-indigo/50 via-marigold/60 to-indigo/20 md:block"
              />
              <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
                {STEPS.map(({ title, body, Icon }, i) => (
                  <Reveal as="li" key={title} index={i} className="relative">
                    <span className="relative grid size-12 place-items-center rounded-2xl border border-line bg-card text-indigo shadow-card">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                      <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-marigold font-mono text-[11px] font-semibold text-ink">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-5 text-xl">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ───────── Trust in practice ───────── */}
        <section id="trust" className="relative overflow-hidden border-t border-line">
          <div aria-hidden="true" className="ambient pointer-events-none absolute inset-0 -z-10 opacity-60" />
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-28">
            <Reveal>
              <p className="eyebrow">Trust in practice</p>
              <h2 className="mt-3 max-w-2xl text-title">See why before you ask. See what happened after.</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Two pieces of Saajha, shown here with fictional demo data. Open the demo to try them for real.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {/* readiness example */}
              <Reveal as="article" className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg">Access-Readiness Check</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Printer className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Prusa MK4 3D Printer ·
                      Student 2
                    </p>
                  </div>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted-foreground">
                    Example
                  </span>
                </header>
                <ul className="mt-5 space-y-1">
                  {EXAMPLE_CHECKS.map((c, i) => (
                    <li
                      key={c.label}
                      data-child=""
                      style={{ "--c": i } as React.CSSProperties}
                      className={cn("flex items-start gap-3 rounded-lg px-2 py-2", !c.pass && "bg-danger-soft/70")}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-surface",
                          c.pass ? "bg-success" : "bg-danger",
                        )}
                        aria-hidden="true"
                      >
                        {c.pass ? "✓" : "✕"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {c.label}
                          <span className="sr-only">{c.pass ? ": passed" : ": failed"}</span>
                        </p>
                        <p className={cn("text-xs", c.pass ? "text-muted-foreground" : "text-danger-ink")}>{c.note}</p>
                        {c.fix && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo">
                            {c.fix} <ArrowRight className="size-3" strokeWidth={2} aria-hidden="true" />
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* history example */}
              <Reveal as="article" index={1} className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg">Booking history</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Camera className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Canon EOS 90D DSLR Kit
                    </p>
                  </div>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted-foreground">
                    Example
                  </span>
                </header>
                <div className="relative mt-6">
                  <Reveal
                    data-reveal="line-y"
                    aria-hidden="true"
                    className="absolute top-1.5 bottom-1.5 left-[7px] w-px bg-linear-to-b from-indigo/60 via-line-strong to-marigold/70"
                  />
                  <ol className="space-y-5 pl-7">
                    {EXAMPLE_HISTORY.map((e, i) => (
                      <li key={e.hash} data-child="" style={{ "--c": i } as React.CSSProperties} className="relative">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-1 -left-7 size-[15px] rounded-full border-[3px] border-card",
                            e.tone === "success" ? "bg-success" : e.tone === "marigold" ? "bg-marigold" : "bg-indigo",
                          )}
                        />
                        <p className="text-sm">
                          <span className="font-medium">{e.actor}</span> {e.action}
                        </p>
                        <p className="text-xs text-muted-foreground">{e.detail}</p>
                        <p className="mt-1 font-mono text-[11px] text-faint">sha256 {e.hash}…</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-xs text-muted-foreground">
                  <Fingerprint className="size-4 text-indigo" strokeWidth={1.75} aria-hidden="true" />
                  Each entry includes the previous entry&apos;s hash, so editing one breaks the chain.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────── Why it's different ───────── */}
        <section className="border-t border-line bg-surface-2/40">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-28">
            <Reveal>
              <p className="eyebrow">Why it&apos;s different from a booking app</p>
              <h2 className="mt-3 max-w-2xl text-title">
                A calendar shows if it&apos;s free. Saajha shows if it&apos;s{" "}
                <em className="text-indigo">safe to share</em>.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DIFFERENT.map(({ title, body, Icon, tone }, i) => (
                <Reveal
                  as="article"
                  key={title}
                  index={i}
                  className="h-full rounded-2xl border border-line bg-card p-6 shadow-card"
                >
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl",
                      tone === "marigold" ? "bg-marigold-soft text-warning-ink" : "bg-indigo-soft text-indigo",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="px-4 py-20 sm:px-6 lg:py-24">
          <Reveal className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl border border-line bg-indigo p-8 text-primary-foreground sm:p-12 dark:bg-indigo-soft dark:text-foreground">
            <div
              aria-hidden="true"
              className="dot-grid pointer-events-none absolute inset-0 opacity-50 invert dark:invert-0"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-marigold/25 blur-3xl"
            />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-title">See it in two minutes.</h2>
                <p className="mt-2 opacity-85">Pick a demo role. No sign-up, and all data is fictional.</p>
              </div>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-marigold px-5 text-[15px] text-ink shadow-none hover:bg-marigold hover:brightness-105 dark:text-paper",
                )}
              >
                <Sparkles data-icon="inline-start" strokeWidth={1.75} />
                Try a demo role
                <ArrowRight data-icon="inline-end" strokeWidth={1.75} />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
