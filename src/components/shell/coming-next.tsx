import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PreviewKind = "bookings" | "passport" | "owner" | "manager" | "admin";

/**
 * Placeholder for routes planned in CLAUDE.md §8 but not built yet: a blurred,
 * non-interactive sketch of the page under a clear "Preview" card. Nothing here is functional.
 */
export function ComingNext({
  title,
  body,
  kind,
  bullets,
}: {
  title: string;
  body: string;
  kind: PreviewKind;
  bullets: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="enter" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="text-page">{title}</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{body}</p>
      </div>

      <div
        className="enter relative isolate overflow-hidden rounded-3xl border border-line"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        {/* the sketch: blurred, hidden from assistive tech, and inert */}
        <div aria-hidden="true" inert className="pointer-events-none p-4 opacity-80 blur-[3px] select-none sm:p-6">
          <Sketch kind={kind} />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-background/30 via-background/60 to-background/85"
        />

        <div className="absolute inset-0 grid place-items-center p-4">
          <section
            aria-labelledby="preview-title"
            className="w-full max-w-md rounded-2xl border border-line bg-popover/90 p-6 shadow-pop backdrop-blur-md"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="size-3 text-warning-ink" strokeWidth={2} aria-hidden="true" /> Preview, not yet
              functional
            </span>
            <h2 id="preview-title" className="mt-3 text-2xl">
              Arriving in the next build
            </h2>
            <ul className="mt-4 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/explore" className={cn(buttonVariants(), "mt-6 h-10 px-4")}>
              Explore resources meanwhile
              <ArrowRight data-icon="inline-end" strokeWidth={1.75} />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

const bar = (w: string, cls = "") => (
  <span className={cn("block h-2.5 rounded-full bg-foreground/15", cls)} style={{ width: w }} />
);
const chip = (label: string, cls: string) => (
  <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium", cls)}>{label}</span>
);
const card = "rounded-2xl border border-line bg-card p-4 shadow-card";

function Sketch({ kind }: { kind: PreviewKind }) {
  if (kind === "passport")
    return (
      <div className="grid min-h-[420px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Lab Safety Level 1", "Oscilloscope Basics", "3D Printer Trained", "Soldering Basics"].map((b, i) => (
          <div key={b} className={card}>
            <span
              className={cn(
                "grid size-10 place-items-center rounded-xl",
                i < 2 ? "bg-success-soft" : "bg-marigold-soft",
              )}
            />
            <p className="mt-4 font-display text-lg font-semibold">{b}</p>
            <div className="mt-3 space-y-2">
              {bar("80%")}
              {bar("55%")}
            </div>
            <div className="mt-4">
              {i < 2
                ? chip("Active", "bg-success-soft text-success-ink")
                : chip("Pending review", "bg-warning-soft text-warning-ink")}
            </div>
          </div>
        ))}
      </div>
    );
  if (kind === "admin")
    return (
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className={card}>
          <div className="flex items-center justify-between">
            {bar("30%")}
            <span className="h-8 w-32 rounded-lg bg-indigo" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-indigo" />
                {bar(`${30 + ((i * 17) % 30)}%`)}
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  sha256 {["9f2c41", "4b7e2a", "c03d18", "71aa5f", "e8b902", "15cd7e"][i]}…
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={card}>
          {bar("45%")}
          <div className="mt-6 flex h-40 items-end gap-2">
            {[60, 85, 40, 70, 95, 50, 65].map((h, i) => (
              <span key={i} className="flex-1 rounded-t-md bg-indigo/40" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  if (kind === "manager")
    return (
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-2">
        {["Badge requests", "Incident queue"].map((t, k) => (
          <div key={t} className={card}>
            <p className="font-display text-lg font-semibold">{t}</p>
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    {bar("45%")}
                    {k
                      ? chip("Open", "bg-danger-soft text-danger-ink")
                      : chip("Pending", "bg-warning-soft text-warning-ink")}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {bar("90%", "opacity-60")}
                    {bar("60%", "opacity-60")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  // bookings + owner: a list of booking rows with states / decision buttons
  const states: [string, string][] = [
    ["Requested", "border border-indigo text-indigo"],
    ["Approved", "bg-success-soft text-success-ink"],
    ["Checked out", "bg-indigo text-primary-foreground"],
    ["Waitlisted", "bg-warning-soft text-warning-ink"],
    ["Returned", "border border-success-ink text-success-ink"],
  ];
  return (
    <div className={cn(card, "min-h-[420px]")}>
      <div className="flex gap-2">
        {["All", "Upcoming", "Past"].map((t, i) => (
          <span key={t} className={cn("h-8 w-20 rounded-full", i ? "bg-muted" : "bg-indigo")} />
        ))}
      </div>
      <div className="mt-5 divide-y divide-line">
        {states.map(([label, cls], i) => (
          <div key={label} className="flex items-center gap-4 py-3.5">
            <span className="size-10 shrink-0 rounded-xl bg-indigo-soft" />
            <div className="min-w-0 flex-1 space-y-2">
              {bar(`${40 + ((i * 13) % 30)}%`)}
              {bar("30%", "opacity-60")}
            </div>
            {kind === "owner" ? (
              <span className="flex gap-2">
                <span className="h-8 w-20 rounded-lg bg-indigo" />
                <span className="h-8 w-20 rounded-lg border border-line" />
              </span>
            ) : (
              chip(label, cls)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
