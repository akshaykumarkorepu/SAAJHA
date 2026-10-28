"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, ClipboardCheck, RotateCcw, X } from "lucide-react";
import { getDemoProfile } from "@/lib/data";
import { setDemoRole, useDemoRole } from "@/lib/demo-session";
import { JUDGE_STEPS, readJudgeEvents, resetJudgeEvents, subscribeJudge, track } from "@/lib/judge";
import { transition } from "@/lib/motion";
import type { DemoRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/components/shell/nav-config";

const DISMISS_KEY = "saajha.judge.dismissed";
const REOPEN_EVENT = "saajha:judge-open";
const DISMISS_EVENT = "saajha:judge-dismiss";

function setDismissedFlag(v: boolean) {
  try {
    if (v) localStorage.setItem(DISMISS_KEY, "1");
    else localStorage.removeItem(DISMISS_KEY);
  } catch {}
  window.dispatchEvent(new Event(DISMISS_EVENT));
}
const dismissedSnapshot = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};
const subscribeDismiss = (cb: () => void) => {
  window.addEventListener(DISMISS_EVENT, cb);
  return () => window.removeEventListener(DISMISS_EVENT, cb);
};

/** Re-show the guide (e.g. from the command palette) after it was dismissed. */
export function openJudgeGuide() {
  setDismissedFlag(false);
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

const eventsSnapshot = () => JSON.stringify(readJudgeEvents());

export function JudgeGuide() {
  const router = useRouter();
  const role = useDemoRole();
  const events: string[] = JSON.parse(useSyncExternalStore(subscribeJudge, eventsSnapshot, () => "[]"));
  // Server snapshot "dismissed" keeps SSR and first paint free of the pill (no hydration mismatch).
  const dismissed = useSyncExternalStore(subscribeDismiss, dismissedSnapshot, () => true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const available = JUDGE_STEPS.filter((s) => s.available);
  const done = (id: string) => {
    const step = JUDGE_STEPS.find((s) => s.id === id);
    return !!step?.available && !!step.events?.some((e) => events.includes(e));
  };
  const doneCount = available.filter((s) => done(s.id)).length;

  function dismiss() {
    setOpen(false);
    setDismissedFlag(true);
    toast("Judge guide hidden", { description: "Bring it back any time from ⌘K → “Judge guide”." });
  }

  function become(r: DemoRole) {
    setDemoRole(r);
    track("switched_role");
    setOpen(false);
    router.push("/explore");
  }

  if (dismissed) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition.enter, delay: 1.2 }}
        className="fixed right-4 bottom-4 z-40 flex items-center rounded-full border border-line bg-popover/95 shadow-pop backdrop-blur sm:right-6 sm:bottom-6"
      >
        <Popover.Trigger className="flex min-h-11 items-center gap-2 rounded-full py-1.5 pr-2 pl-3.5 text-sm font-medium">
          <ClipboardCheck className="size-4 text-indigo" strokeWidth={1.75} aria-hidden="true" />
          Judge guide
          <span className="rounded-full bg-marigold-soft px-2 py-0.5 font-mono text-[11px] text-warning-ink">
            {doneCount}/{available.length}
          </span>
        </Popover.Trigger>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide judge guide"
          className="mr-1 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </motion.div>

      <Popover.Portal>
        <Popover.Positioner side="top" align="end" sideOffset={10} className="z-50">
          <Popover.Popup className="w-[min(400px,calc(100vw-2rem))] origin-(--transform-origin) rounded-2xl border border-line bg-popover text-popover-foreground shadow-pop transition-[opacity,transform] duration-200 ease-(--ease-out) outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="border-b border-line p-4">
              <Popover.Title className="font-display text-lg font-semibold">Judge guide</Popover.Title>
              <Popover.Description className="mt-0.5 text-xs text-muted-foreground">
                The CLAUDE.md test script. Steps tick themselves as you do them. All data is fictional.
              </Popover.Description>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <motion.div
                  className="h-full rounded-full bg-marigold"
                  initial={false}
                  animate={{ width: `${(doneCount / Math.max(1, available.length)) * 100}%` }}
                  transition={transition.enter}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground" aria-live="polite">
                {doneCount} of {available.length} available steps done
              </p>
            </div>

            <ol className="max-h-[min(46vh,360px)] space-y-1 overflow-y-auto p-2">
              {JUDGE_STEPS.map((s, i) => {
                const ok = done(s.id);
                return (
                  <li
                    key={s.id}
                    className={cn("flex gap-3 rounded-lg p-2.5", !s.available && "opacity-60", ok && "bg-success-soft/60")}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[10px]",
                        ok ? "border-success bg-success text-surface" : "border-line-strong text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {ok ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {s.title}
                        {!s.available && (
                          <span className="rounded-full border border-line px-1.5 py-px text-[10px] font-normal text-muted-foreground">
                            Next build
                          </span>
                        )}
                        <span className="sr-only">{ok ? "(done)" : s.available ? "(to do)" : "(not built yet)"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="border-t border-line p-3">
              <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Become a demo role</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(ROLE_LABEL) as DemoRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => become(r)}
                    aria-pressed={role === r}
                    title={getDemoProfile(r).full_name}
                    className={cn(
                      "min-h-9 rounded-lg border px-2 text-xs font-medium transition-colors",
                      role === r ? "border-indigo bg-indigo-soft text-indigo" : "border-line hover:border-indigo/45 hover:bg-surface-2",
                    )}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetJudgeEvents}
                className="mt-2 inline-flex items-center gap-1.5 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" strokeWidth={1.75} aria-hidden="true" /> Reset progress
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
