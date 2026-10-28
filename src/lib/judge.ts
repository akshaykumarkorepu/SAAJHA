// Judge guide: the CLAUDE.md §12 test script as one config array, plus a tiny
// localStorage event tracker that ticks steps off as they happen in the UI.
// To unlock a step when its feature ships: set `available: true` and give it
// the `event` the UI emits (via track()) when the step is completed.

export type JudgeEvent =
  | "landing_demo"
  | "viewed_resource"
  | "readiness_ready"
  | "readiness_waitlist"
  | "readiness_badge_fail"
  | "requested"
  | "switched_role"
  | "palette";

export interface JudgeStep {
  id: string;
  title: string;
  detail: string;
  available: boolean;
  /** Completed when any of these events has fired. */
  events?: JudgeEvent[];
  href?: string;
}

export const JUDGE_STEPS: JudgeStep[] = [
  {
    id: "owner-create",
    title: "Owner lists a new resource",
    detail: "Log in as Owner and publish a “Sony Mirrorless Kit” with rules.",
    available: false,
  },
  {
    id: "student-request",
    title: "Student finds a camera and is ready",
    detail: "As Student, search “camera”, open the DSLR, watch every check pass, then request.",
    available: true,
    events: ["requested"],
    href: "/explore",
  },
  {
    id: "student2-waitlist",
    title: "Student 2 hits a taken slot",
    detail: "As Student 2, open the DSLR, pick Tomorrow → 2 PM and see waitlist #1 with the score explained.",
    available: true,
    events: ["readiness_waitlist"],
  },
  {
    id: "student2-badge",
    title: "Student 2 is missing a badge",
    detail: "As Student 2, open the 3D printer: the badge check fails and shows how to fix it.",
    available: true,
    events: ["readiness_badge_fail"],
  },
  {
    id: "owner-approve",
    title: "Owner approves, double booking blocked",
    detail: "Approve Student’s request; approving a conflicting one is refused with a reason.",
    available: false,
  },
  {
    id: "handover",
    title: "Check out and return with evidence",
    detail: "Condition “good” at check-out, “fair” with a scratch note at return; AI flags the difference.",
    available: false,
  },
  {
    id: "incident",
    title: "Damage report and fair penalty",
    detail: "Report damage; the Manager reviews the AI summary and resolves with a written reason.",
    available: false,
  },
  {
    id: "ledger",
    title: "Full timeline and verified ledger",
    detail: "Open the booking timeline; as Admin, verify the audit ledger’s integrity.",
    available: false,
  },
];

const KEY = "saajha.judge.events";
const EVENT = "saajha:judge";

export function readJudgeEvents(): JudgeEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function track(event: JudgeEvent) {
  try {
    const all = new Set(readJudgeEvents());
    if (all.has(event)) return;
    all.add(event);
    localStorage.setItem(KEY, JSON.stringify([...all]));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function resetJudgeEvents() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function subscribeJudge(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
