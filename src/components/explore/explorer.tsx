"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Info, Search, SearchX, X } from "lucide-react";
import { getResources } from "@/lib/data";
import type { Category, ResourceView } from "@/lib/types";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_META, CategoryIcon } from "@/components/saajha/category-icon";
import { EmptyState } from "@/components/saajha/empty-state";
import { ErrorState } from "@/components/saajha/error-state";
import { ResourceGridSkeleton } from "@/components/saajha/skeletons";
import { useSession } from "@/components/shell/session";
import { NeedBox } from "./need-box";
import { ResourceCard } from "./resource-card";

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function matchesQuery(r: ResourceView, q: string) {
  if (!q) return true;
  const hay =
    `${r.name} ${r.description} ${r.location} ${r.owner.department} ${CATEGORY_META[r.category].label} ${r.required_badges.map((b) => b.name).join(" ")}`.toLowerCase();
  const synonyms: Record<string, string> = {
    camera: "dslr",
    photo: "dslr",
    scope: "oscilloscope",
    printer: "3d",
    room: "room hall",
    pi: "raspberry",
  };
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w) || (synonyms[w] ?? "").split(" ").some((s) => s && hay.includes(s)));
}

function openOn(r: ResourceView, date: string) {
  if (!date) return true;
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return r.status === "active" && r.availability.some((w) => w.weekday === weekday);
}

export function Explorer() {
  const { profile, role } = useSession();
  const [resources, setResources] = useState<ResourceView[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [date, setDate] = useState("");
  const [today, setToday] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    (isLive: () => boolean = () => true) =>
      getResources(profile.id).then(
        (r) => {
          if (!isLive()) return;
          setFailed(false);
          setResources(r);
          setToday(new Date());
        },
        () => isLive() && setFailed(true),
      ),
    [profile.id],
  );

  useEffect(() => {
    let live = true;
    load(() => live);
    return () => {
      live = false;
    };
  }, [load]);

  const base = useMemo(
    () => (resources ?? []).filter((r) => matchesQuery(r, query) && openOn(r, date)),
    [resources, query, date],
  );
  const counts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    base.forEach((r) => c[r.category]++);
    return c;
  }, [base]);
  const shown = category === "all" ? base : base.filter((r) => r.category === category);
  const filtered = query || date || category !== "all";

  const quickDates = [{ label: "Any day", value: "" }];
  if (today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    quickDates.push({ label: "Today", value: toDateInput(today) }, { label: "Tomorrow", value: toDateInput(tomorrow) });
  }

  function clear() {
    setQuery("");
    setCategory("all");
    setDate("");
  }

  return (
    <div className="space-y-8">
      <header className="enter space-y-2" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="text-page">Find something to borrow</h1>
        <p className="text-muted-foreground">
          Idle equipment and rooms across campus. Open one to see if you&apos;re ready to request it.
        </p>
      </header>

      {role === "partner" && (
        <p className="flex items-start gap-2 rounded-xl border border-indigo/30 bg-indigo-soft px-4 py-3 text-sm text-indigo">
          <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          You&apos;re visiting from a partner college, so you see only what NIT Warangal labs chose to share with
          partners. Every booking needs owner approval and a supervisor.
        </p>
      )}

      <div className="enter" style={{ "--i": 1 } as React.CSSProperties}>
        <NeedBox />
      </div>

      <section aria-label="Search and filters" className="enter space-y-4" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <label htmlFor="search" className="sr-only">
              Search resources
            </label>
            <Input
              id="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search camera, oscilloscope, project room…"
              className="h-11 bg-card pl-9 text-[15px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Open on">
            <CalendarDays className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            {quickDates.map((d) => (
              <CategoryChip
                key={d.label}
                group="date"
                active={date === d.value}
                onClick={() => setDate(d.value)}
                label={d.label}
              />
            ))}
            <label htmlFor="date" className="sr-only">
              Pick a date
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              min={today ? toDateInput(today) : undefined}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-[150px] rounded-full bg-card"
            />
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1" role="group" aria-label="Category">
          <div className="flex w-max gap-2">
            <CategoryChip
              group="category"
              active={category === "all"}
              onClick={() => setCategory("all")}
              label="All"
              count={base.length}
            />
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                group="category"
                active={category === c}
                onClick={() => setCategory(c)}
                label={CATEGORY_META[c].label}
                count={counts[c]}
                icon={<CategoryIcon category={c} className="size-4" />}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        aria-label="Resources"
        aria-busy={!resources}
        className="enter"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        {failed ? (
          <ErrorState title="We couldn't load resources" onRetry={() => load()} />
        ) : !resources ? (
          <ResourceGridSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={query ? `Nothing matches "${query}" yet` : "Nothing fits those filters"}
            body="Try another word or a different day. Labs add new kit every week."
            action={
              <Button onClick={clear}>
                <X data-icon="inline-start" strokeWidth={1.75} /> Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
              {shown.length} {shown.length === 1 ? "resource" : "resources"}
              {filtered && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded underline underline-offset-4 hover:text-foreground"
                  >
                    clear filters
                  </button>
                </>
              )}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((r, i) => (
                <ResourceCard key={r.id} resource={r} index={i} />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function CategoryChip({
  group,
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  /** Chips in the same group share one sliding active pill. */
  group: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative isolate inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-[color,border-color,transform] duration-200 ease-(--ease-out) active:scale-[0.97] motion-reduce:transform-none",
        active
          ? "border-indigo text-primary-foreground"
          : "border-line-strong bg-card text-foreground hover:border-indigo/50 hover:bg-surface-2",
      )}
    >
      {active && (
        <motion.span
          layoutId={`chip-${group}`}
          transition={transition.spring}
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-indigo"
        />
      )}
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "tabular rounded-full px-1.5 font-mono text-[11px] leading-5",
            active ? "bg-white/20 dark:bg-black/20" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
