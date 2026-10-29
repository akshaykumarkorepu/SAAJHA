"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Globe2,
  MapPin,
  PackageX,
  ShieldCheck,
  Timer,
  UserCheck,
  Wrench,
} from "lucide-react";
import { getBusySlots, getResource, requestBooking, runReadinessCheck } from "@/lib/data";
import { formatSlot, hourLabel, makeSlot } from "@/lib/slots";
import type { BookingStatus, ReadinessResult, ResourceView, Slot } from "@/lib/types";
import { shake, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_META, CategoryIcon } from "@/components/saajha/category-icon";
import { EmptyState } from "@/components/saajha/empty-state";
import { DetailSkeleton } from "@/components/saajha/skeletons";
import { ErrorState } from "@/components/saajha/error-state";
import { Pill, StatusChip } from "@/components/saajha/status-chip";
import { useSession } from "@/components/shell/session";
import { ReadinessPanel } from "./readiness-panel";
import { dayDate, defaultChoice, SlotPicker, type SlotChoice } from "./slot-picker";
import { WeekStrip } from "./week-strip";
import { Burst } from "@/components/saajha/burst";
import { track } from "@/lib/judge";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Loaded {
  resource: ResourceView | null;
  busy: Slot[];
  today: Date;
}

export function ResourceDetail({ id }: { id: string }) {
  const { profile } = useSession();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    (isLive: () => boolean = () => true) =>
      Promise.all([getResource(id, profile.id), getBusySlots(id)]).then(
        ([resource, busy]) => {
          if (!isLive()) return;
          setFailed(false);
          setData({ resource, busy, today: new Date() });
        },
        () => isLive() && setFailed(true),
      ),
    [id, profile.id],
  );

  useEffect(() => {
    let live = true;
    load(() => live);
    return () => {
      live = false;
    };
  }, [load]);

  if (failed) return <ErrorState title="We couldn't load this resource" onRetry={() => load()} />;
  if (!data) return <DetailSkeleton />;
  if (!data.resource)
    return (
      <EmptyState
        icon={PackageX}
        title="We couldn't find that resource"
        body="It may have been removed, or it isn't shared with your institute."
        action={
          <Link href="/explore" className={buttonVariants()}>
            Back to Explore
          </Link>
        }
      />
    );
  return <Loaded resource={data.resource} busy={data.busy} today={data.today} />;
}

function Loaded({ resource: r, busy, today }: { resource: ResourceView; busy: Slot[]; today: Date }) {
  const [choice, setChoice] = useState<SlotChoice>(
    () =>
      defaultChoice(today, r.availability, busy, r.max_hours) ?? { day: 1, hour: 10, hours: Math.min(2, r.max_hours) },
  );
  useEffect(() => track("viewed_resource"), []);
  return (
    <div className="space-y-8">
      <title>{`${r.name} · Saajha`}</title>
      <header className="enter space-y-4" style={{ "--i": 0 } as React.CSSProperties}>
        <Link
          href="/explore"
          className="group inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            strokeWidth={1.75}
            aria-hidden="true"
          />{" "}
          All resources
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-soft text-indigo">
            <CategoryIcon category={r.category} className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Pill tone="indigo">{CATEGORY_META[r.category].label}</Pill>
              {r.requires_supervision && (
                <Pill tone="marigold">
                  <Eye className="size-3" strokeWidth={2} aria-hidden="true" /> Supervised
                </Pill>
              )}
              {r.visibility === "partner" && (
                <Pill>
                  <Globe2 className="size-3" strokeWidth={2} aria-hidden="true" /> Shared with partner colleges
                </Pill>
              )}
              {r.status !== "active" && (
                <Pill tone="danger">
                  <Wrench className="size-3" strokeWidth={2} aria-hidden="true" /> Under {r.status}
                </Pill>
              )}
            </div>
            <h1 className="mt-2 text-page">{r.name}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
                {r.owner.department} · {r.owner.full_name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" strokeWidth={1.75} aria-hidden="true" />
                {r.location}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="enter min-w-0 space-y-6" style={{ "--i": 2 } as React.CSSProperties}>
          <WeekStrip
            today={today}
            windows={r.availability}
            busy={busy}
            maxHours={r.max_hours}
            value={choice}
            onChange={setChoice}
          />
          <InfoTabs resource={r} busy={busy} />
        </div>
        {/* self-stretch keeps the row's full height so the panel can still stick on desktop */}
        <div className="enter min-w-0 lg:self-stretch" style={{ "--i": 1 } as React.CSSProperties}>
          <BookingPanel resource={r} busy={busy} today={today} choice={choice} onChoice={setChoice} />
        </div>
      </div>
    </div>
  );
}

function InfoTabs({ resource: r, busy }: { resource: ResourceView; busy: Slot[] }) {
  const [tab, setTab] = useState("overview");
  const facts = [
    { Icon: Timer, label: "Max per booking", value: `${r.max_hours} hours` },
    { Icon: Coins, label: "Credit cost", value: `${r.credit_cost} of 10 weekly credits` },
    {
      Icon: Clock,
      label: "Cooldown",
      value: r.cooldown_hours ? `${r.cooldown_hours} h between your bookings` : "None",
    },
    {
      Icon: ShieldCheck,
      label: "Approval",
      value: r.requires_approval ? "Lab in-charge approves" : "Auto-approved if ready",
    },
  ];
  const upcomingBusy = busy.filter((b) => new Date(b.ends_at) > new Date()).slice(0, 5);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as string)}
      className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-6"
    >
      <TabsList variant="line" className="w-full justify-start gap-1 border-b border-line pb-1 sm:w-fit">
        {[
          ["overview", "Overview"],
          ["rules", "Rules"],
          ["availability", "Availability"],
        ].map(([v, label]) => (
          <TabsTrigger key={v} value={v} className="min-h-9 flex-none px-3 after:hidden">
            {label}
            {tab === v && (
              <motion.span
                layoutId={`tab-underline-${r.id}`}
                transition={transition.spring}
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-[5px] h-0.5 rounded-full bg-marigold"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-6 pt-4">
        <p className="text-[15px] leading-relaxed">{r.description}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-indigo" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <div>
          <h2 className="text-lg">Required badges</h2>
          {r.required_badges.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              None. Anyone verified at the institute can request this.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {r.required_badges.map((b) => (
                <li key={b.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <BadgeCheck
                    className="mt-0.5 size-5 shrink-0 text-warning-ink"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {b.name} <span className="ml-1 font-mono text-xs text-muted-foreground">{b.code}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </TabsContent>

      <TabsContent value="rules" className="pt-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Set by {r.owner.full_name}. You agree to these when you request.
        </p>
        <ol className="space-y-2">
          {r.usage_rules.split("\n").map((rule, i) => (
            <li key={i} className="flex gap-3 rounded-xl border p-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-indigo-soft font-mono text-xs font-semibold text-indigo">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ol>
      </TabsContent>

      <TabsContent value="availability" className="space-y-6 pt-4">
        <div>
          <h2 className="text-lg">Opening hours</h2>
          <ul className="mt-3 divide-y rounded-xl border">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const w = r.availability.find((x) => x.weekday === d);
              return (
                <li key={d} className="flex justify-between px-3 py-2 text-sm">
                  <span>{WEEKDAYS[d]}</span>
                  <span className={cn("font-mono text-xs", !w && "text-muted-foreground")}>
                    {w ? `${hourLabel(parseInt(w.start_time))} – ${hourLabel(parseInt(w.end_time))}` : "Closed"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h2 className="text-lg">Already booked</h2>
          {upcomingBusy.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing booked yet. Every open hour is free.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcomingBusy.map((b) => (
                <li
                  key={b.starts_at}
                  className="flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning-ink"
                >
                  <CalendarClock className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  {formatSlot(b)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function BookingPanel({
  resource: r,
  busy,
  today,
  choice,
  onChoice: setChoice,
}: {
  resource: ResourceView;
  busy: Slot[];
  today: Date;
  choice: SlotChoice;
  onChoice: (c: SlotChoice) => void;
}) {
  const { profile } = useSession();
  const slot = useMemo(() => makeSlot(dayDate(today, choice.day), choice.hour, choice.hours), [today, choice]);
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState(false);
  const [sent, setSent] = useState<{ status: BookingStatus; position?: number; slot: Slot } | null>(null);
  const [purpose, setPurpose] = useState("");
  const [purposeError, setPurposeError] = useState(false);
  const [sending, setSending] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const shakeCtl = useAnimationControls();
  const glow = useAnimationControls();

  useEffect(() => {
    let live = true;
    runReadinessCheck(r.id, profile.id, slot).then(
      (res) => live && setResult(res),
      () => live && setCheckFailed(true),
    );
    return () => {
      live = false;
      setResult(null);
      setCheckFailed(false);
    };
  }, [r.id, profile.id, slot, attempt]);

  const outcome = settled ? result?.outcome : undefined;

  useEffect(() => {
    if (!settled || !result) return;
    if (result.outcome === "ready") track("readiness_ready");
    if (result.outcome === "waitlist") track("readiness_waitlist");
    if (result.checks.some((c) => c.key === "badges" && !c.passed)) track("readiness_badge_fail");
  }, [settled, result]);

  useEffect(() => {
    if (outcome === "ready") {
      glow.start({
        boxShadow: [
          "0 0 0 0 rgba(242,165,49,0)",
          "0 0 0 6px rgba(242,165,49,0.45)",
          "0 0 22px 2px rgba(242,165,49,0.35)",
          "0 0 0 0 rgba(242,165,49,0)",
        ],
        transition: { duration: 1.4, ease: "easeOut" },
      });
    }
  }, [outcome, glow]);

  async function submit() {
    if (celebrating) return;
    if (!purpose.trim()) {
      setPurposeError(true);
      shakeCtl.start(shake);
      document.getElementById("purpose")?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await requestBooking(r.id, profile.id, slot, purpose);
      track("requested");
      // Success moment: the button becomes a tick with one short burst, then the confirmation card.
      setSending(false);
      setCelebrating(true);
      await new Promise((done) => setTimeout(done, 750));
      setCelebrating(false);
      setSent({ status: res.status, position: res.position, slot });
      if (res.status === "waitlisted") {
        toast.success(`You're #${res.position} on the waitlist`, {
          description: `If ${formatSlot(slot)} frees up, you'll be offered it first.`,
        });
      } else {
        toast.success(
          r.requires_approval ? `Sent to ${r.owner.full_name}, ${r.owner.department}` : "Booked. It's yours.",
          {
            description: r.requires_approval
              ? "You'll be notified when they decide, with their reason."
              : formatSlot(slot),
          },
        );
      }
    } catch (e) {
      toast.error("Couldn't send the request", { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Request this resource">
      <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
        <h2 className="text-lg">1 · Pick a slot</h2>
        <div className="mt-4">
          <SlotPicker
            today={today}
            windows={r.availability}
            busy={busy}
            maxHours={r.max_hours}
            value={choice}
            onChange={setChoice}
          />
        </div>
      </section>

      <section
        className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5"
        aria-labelledby="readiness-title"
      >
        <h2 id="readiness-title" className="text-lg">
          2 · Access-Readiness Check
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          For <span className="font-mono text-foreground">{formatSlot(slot)}</span>. The same checks run again on the
          server when you submit.
        </p>
        <div className="mt-3">
          {checkFailed ? (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger-ink">
              <p className="font-medium">The readiness check didn&apos;t finish.</p>
              <p className="mt-0.5 text-xs">Nothing was sent. Run it again to see where you stand.</p>
              <Button variant="outline" className="mt-3 h-8" onClick={() => setAttempt((n) => n + 1)}>
                Run the check again
              </Button>
            </div>
          ) : (
            <ReadinessPanel result={result} onSettled={setSettled} />
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {sent && sent.slot === slot ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={transition.enter}
              role="status"
              className="mt-5 rounded-xl border border-line bg-surface-2/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} aria-hidden="true" />
                  {sent.status === "waitlisted" ? `You're #${sent.position} on the waitlist` : "Request sent"}
                </p>
                <StatusChip status={sent.status} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {sent.status === "waitlisted"
                  ? `If ${formatSlot(sent.slot)} frees up, you'll be offered it first.`
                  : r.requires_approval
                    ? `${r.owner.full_name} will review it and you'll be notified with the decision and reason.`
                    : `${formatSlot(sent.slot)} is yours.`}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Pick another slot above to make a different request.</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition.base}
            >
              <div className="mt-5 space-y-2">
                {/* Floating label: sits inside the field until you type or focus, then rises. */}
                <motion.div animate={shakeCtl} className="relative">
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      if (e.target.value.trim()) setPurposeError(false);
                    }}
                    rows={2}
                    placeholder=" "
                    aria-invalid={purposeError || undefined}
                    aria-describedby={purposeError ? "purpose-error" : "purpose-hint"}
                    className="peer min-h-20 resize-none pt-6"
                  />
                  <Label
                    htmlFor="purpose"
                    className="pointer-events-none absolute top-2 left-2.5 origin-left text-xs font-medium text-muted-foreground transition-all duration-200 ease-(--ease-out) peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-indigo peer-aria-invalid:text-danger-ink"
                  >
                    Purpose
                  </Label>
                </motion.div>
                <p id="purpose-hint" className="sr-only">
                  What will you use it for? Owners decide faster with a clear reason.
                </p>
                {/* Reserved line so the message never pushes the button down. */}
                <p
                  id="purpose-error"
                  aria-live="polite"
                  className={cn("h-4 text-xs text-danger-ink transition-opacity duration-200")}
                >
                  {purposeError ? "Add a one-line purpose so the owner knows why you need it." : ""}
                  {!purposeError && (
                    <span className="text-muted-foreground">Owners decide faster with a clear reason.</span>
                  )}
                </p>
              </div>

              <motion.div animate={glow} className="relative mt-2 rounded-[10px]">
                {celebrating && <Burst />}
                <Button
                  onClick={submit}
                  loading={sending}
                  aria-live="polite"
                  disabled={!outcome || outcome === "blocked"}
                  className={cn(
                    "h-11 w-full text-[15px]",
                    outcome === "waitlist" &&
                      "bg-warning text-ink hover:bg-warning hover:brightness-105 dark:text-paper",
                  )}
                >
                  {celebrating ? (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={transition.spring}
                      className="inline-flex items-center gap-2"
                    >
                      <CheckCircle2 className="size-5" strokeWidth={2} aria-hidden="true" />
                      {outcome === "waitlist" ? "On the waitlist" : "Sent"}
                    </motion.span>
                  ) : !outcome ? (
                    "Checking…"
                  ) : sending ? (
                    "Sending…"
                  ) : outcome === "ready" ? (
                    r.requires_approval ? (
                      "Request access"
                    ) : (
                      "Book now"
                    )
                  ) : outcome === "waitlist" ? (
                    `Join waitlist (#${result?.waitlist?.position})`
                  ) : (
                    "Fix the items above first"
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </aside>
  );
}
