import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Fingerprint,
  Handshake,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroAnimation } from "@/components/landing/hero-animation";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter, SiteHeader } from "@/components/landing/site-header";
import { cn } from "@/lib/utils";

const STEPS: { title: string; body: string; Icon: LucideIcon }[] = [
  { title: "List", body: "A lab in-charge lists the idle oscilloscope with its rules, badges and opening hours.", Icon: ClipboardList },
  { title: "Check readiness", body: "Before you ask, Saajha shows exactly what you meet and what's missing, and how to fix it.", Icon: ScanSearch },
  { title: "Approve fairly", body: "Owners decide with a reason. Busy slots go to an explainable waitlist, not whoever clicks fastest.", Icon: Scale },
  { title: "Hand over with evidence", body: "Condition and photos at check-out and return, so damage questions have answers.", Icon: Handshake },
];

const DIFFERENT: { title: string; body: string; Icon: LucideIcon; tone: "indigo" | "marigold" }[] = [
  { title: "Access-Readiness Check", body: "Eight checks run before you request, from training badges to credits, each with a plain reason and a next step.", Icon: BadgeCheck, tone: "marigold" },
  { title: "Fair allocation", body: "Weekly credits, booking caps, cooldowns and a waitlist score you can read line by line.", Icon: Scale, tone: "indigo" },
  { title: "Evidence-backed handover", body: "Before/after condition reports that can't be edited later, with an AI hint when something changed.", Icon: ShieldCheck, tone: "indigo" },
  { title: "Tamper-evident history", body: "Every approval, return and penalty is hash-chained. One click verifies nobody rewrote the past.", Icon: Fingerprint, tone: "marigold" },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-24">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-marigold" aria-hidden="true" />
                For NIT Warangal labs, clubs and partner colleges
              </p>
              <h1 className="text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-[4rem]">
                Idle labs,
                <br />
                <span className="text-indigo">shared</span> with trust.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Borrow the 3D printer, scope or seminar hall that sits unused down the corridor, with clear rules, fair
                approvals and a record everyone can trust.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/explore" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-[15px]")}>
                  Explore resources
                  <ArrowRight data-icon="inline-end" strokeWidth={1.75} />
                </Link>
                <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-5 text-[15px]")}>
                  Try a demo role
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t pt-6">
                {[
                  ["8", "resources listed"],
                  ["4", "categories"],
                  ["0", "double bookings possible"],
                ].map(([n, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-2xl font-semibold">{n}</dd>
                    <dd className="text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroAnimation />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t bg-card/40">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
            <Reveal>
              <p className="text-sm font-medium text-indigo">How Saajha works</p>
              <h2 className="mt-2 max-w-xl text-3xl sm:text-4xl">From idle shelf to trusted handover, in four steps.</h2>
            </Reveal>
            <div role="list" className="relative mt-12 grid gap-6 md:grid-cols-4">
              <div className="absolute top-6 right-[12%] left-[12%] hidden h-px bg-line md:block" aria-hidden="true" />
              {STEPS.map(({ title, body, Icon }, i) => (
                <Reveal key={title} index={i} className="relative">
                  <div role="listitem">
                    <span className="relative grid size-12 place-items-center rounded-2xl border bg-card text-indigo shadow-card">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                      <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-marigold font-mono text-[11px] font-semibold text-ink">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-4 text-xl">{title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Why it's different */}
        <section className="border-t">
          <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
            <Reveal>
              <p className="text-sm font-medium text-indigo">Why it&apos;s different from a booking app</p>
              <h2 className="mt-2 max-w-2xl text-3xl sm:text-4xl">
                A calendar shows if it&apos;s free. Saajha shows if it&apos;s <em className="text-indigo">safe to share</em>.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DIFFERENT.map(({ title, body, Icon, tone }, i) => (
                <Reveal key={title} index={i}>
                  <article className="card-lift h-full rounded-2xl border bg-card p-6">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-xl",
                        tone === "marigold" ? "bg-marigold-soft text-warning-ink" : "bg-indigo-soft text-indigo",
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg">{title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl border bg-indigo p-8 text-primary-foreground sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl">See it in two minutes.</h2>
                  <p className="mt-1 opacity-85">Pick a demo role. No sign-up, all data is fictional.</p>
                </div>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 bg-marigold px-5 text-[15px] text-ink hover:bg-marigold/90",
                  )}
                >
                  <Sparkles data-icon="inline-start" strokeWidth={1.75} />
                  Try a demo role
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
