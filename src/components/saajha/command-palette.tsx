"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Clock,
  CornerDownLeft,
  LayoutGrid,
  LogOut,
  Moon,
  Repeat,
  Search,
  type LucideIcon,
} from "lucide-react";
import { getDemoProfile, getResources } from "@/lib/data";
import { setDemoRole, useDemoRole } from "@/lib/demo-session";
import { track } from "@/lib/judge";
import type { DemoRole, ResourceView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { toggleTheme } from "./theme";
import { openJudgeGuide } from "./judge-guide";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/components/shell/nav-config";

const OPEN_EVENT = "saajha:palette";
const RECENT_KEY = "saajha.palette.recent";

/** Open the palette from anywhere (e.g. the ⌘K hint button). */
export function openPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Command {
  id: string;
  group: "Resources" | "Go to" | "Switch demo role" | "Actions";
  label: string;
  hint?: string;
  keywords?: string;
  icon: React.ReactNode;
  run: () => void;
}

/** Subsequence match with bonuses for word starts and consecutive runs. 0 = no match. */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = text.toLowerCase();
  if (!q) return 1;
  let score = 0;
  let ti = 0;
  let run = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    const wordStart = found === 0 || /[\s\-·(]/.test(t[found - 1]);
    run = found === ti ? run + 1 : 0;
    score += 1 + (wordStart ? 3 : 0) + run * 2 - Math.min(found - ti, 5) * 0.2;
    ti = found + 1;
  }
  return score + (t.startsWith(query.toLowerCase()) ? 5 : 0);
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

const icon = (Icon: LucideIcon) => <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />;

export function CommandPalette() {
  const router = useRouter();
  const role = useDemoRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [resources, setResources] = useState<ResourceView[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  // Every open (click, ⌘K, openPalette()) starts from an empty search.
  const show = useCallback((next: boolean) => {
    openRef.current = next;
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(0);
      setRecent(readRecent());
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show(!openRef.current);
      }
    };
    const onOpen = () => show(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [show]);

  // Load lazily on first open; visitors without a role search the campus as the demo Student would.
  useEffect(() => {
    if (!open) return;
    track("palette");
    let live = true;
    getResources(getDemoProfile(role ?? "student").id).then((r) => live && setResources(r));
    return () => {
      live = false;
    };
  }, [open, role]);


  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const pages = role
      ? NAV_BY_ROLE[role]
      : [
          { href: "/", label: "Home" },
          { href: "/explore", label: "Explore" },
        ];
    return [
      ...resources.map<Command>((r) => ({
        id: `res:${r.id}`,
        group: "Resources",
        label: r.name,
        hint: r.location.split(",")[0],
        keywords: `${r.category.replace("_", " ")} ${r.location} ${r.required_badges.map((b) => b.name).join(" ")}`,
        icon: <CategoryIcon category={r.category} className="size-4" />,
        run: go(`/resources/${r.id}`),
      })),
      ...pages.map<Command>((p) => ({
        id: `page:${p.href}`,
        group: "Go to",
        label: p.label,
        hint: p.href,
        icon: icon(LayoutGrid),
        run: go(p.href),
      })),
      {
        id: "page:/login",
        group: "Go to",
        label: "Demo roles",
        hint: "/login",
        icon: icon(LayoutGrid),
        run: go("/login"),
      },
      ...(Object.keys(ROLE_LABEL) as DemoRole[])
        .filter((r) => r !== role)
        .map<Command>((r) => ({
          id: `role:${r}`,
          group: "Switch demo role",
          label: `Switch to ${ROLE_LABEL[r]}`,
          hint: getDemoProfile(r).full_name,
          keywords: "role login user persona",
          icon: icon(Repeat),
          run: () => {
            setDemoRole(r);
            track("switched_role");
            toast.success(`Now viewing as ${ROLE_LABEL[r]}`, { description: getDemoProfile(r).full_name });
            if (!window.location.pathname.startsWith("/resources")) router.push("/explore");
          },
        })),
      {
        id: "act:theme",
        group: "Actions",
        label: "Toggle theme",
        keywords: "dark light mode",
        icon: icon(Moon),
        run: () => toggleTheme(),
      },
      {
        id: "act:judge",
        group: "Actions",
        label: "Judge guide",
        keywords: "test script help tour checklist",
        icon: icon(ClipboardCheck),
        run: openJudgeGuide,
      },
      ...(role
        ? [
            {
              id: "act:signout",
              group: "Actions" as const,
              label: "Sign out of the demo",
              icon: icon(LogOut),
              run: () => {
                setDemoRole(null);
                router.push("/login");
              },
            },
          ]
        : []),
    ];
  }, [resources, role, router]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const rec = recent.map((id) => commands.find((c) => c.id === id)).filter((c): c is Command => !!c);
      const rest = commands.filter((c) => !recent.includes(c.id));
      return [...rec.map((c) => ({ ...c, recent: true })), ...rest.map((c) => ({ ...c, recent: false }))];
    }
    return commands
      .map((c) => {
        // Fuzzy on the label; hints and keywords only count as whole substrings, so long text can't win by accident.
        const extra = `${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase();
        return { c, s: fuzzyScore(query, c.label) * 1.5 + (extra.includes(query.trim().toLowerCase()) ? 6 : 0) };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map(({ c }) => ({ ...c, recent: false }));
  }, [query, commands, recent]);

  function run(c: Command) {
    try {
      const next = [c.id, ...readRecent().filter((id) => id !== c.id)].slice(0, 4);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    show(false);
    c.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = results.length;
      if (!n) return;
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      run(results[active]);
    }
  }

  const groupOf = (c: (typeof results)[number]) => (c.recent ? "Recent" : c.group);
  return (
    <Dialog.Root open={open} onOpenChange={show}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/55" />
        <Dialog.Popup
          aria-label="Command palette"
          className="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-popover/85 text-popover-foreground shadow-pop backdrop-blur-xl backdrop-saturate-150 transition-[opacity,transform] duration-200 ease-(--ease-out) outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
        >
          <Dialog.Title className="sr-only">Search Saajha</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search resources, pages, roles…"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={results[active] ? `palette-${active}` : undefined}
              aria-autocomplete="list"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground focus-visible:outline-none"
            />
            <kbd className="hidden rounded-md border border-line px-1.5 font-mono text-[11px] text-muted-foreground sm:block">
              Esc
            </kbd>
          </div>

          <div
            ref={listRef}
            id="palette-list"
            role="listbox"
            aria-label="Results"
            className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
          >
            {results.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                Nothing matches &ldquo;{query}&rdquo;. Try &ldquo;camera&rdquo;, &ldquo;room&rdquo; or &ldquo;student
                2&rdquo;.
              </p>
            )}
            {results.map((c, i) => {
              const group = groupOf(c);
              const header = i === 0 || groupOf(results[i - 1]) !== group ? group : null;
              return (
                <div key={c.id + (c.recent ? ":r" : "")}>
                  {header && (
                    <p
                      className="px-3 pt-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                      aria-hidden="true"
                    >
                      {header}
                    </p>
                  )}
                  <div
                    id={`palette-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => i !== active && setActive(i)}
                    onClick={() => run(c)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-100",
                      i === active ? "bg-indigo-soft text-foreground" : "text-foreground/90",
                    )}
                  >
                    <span className={cn("shrink-0", i === active ? "text-indigo" : "text-muted-foreground")}>
                      {c.recent ? icon(Clock) : c.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="hidden truncate text-xs text-muted-foreground sm:block">{c.hint}</span>}
                    {i === active && (
                      <CornerDownLeft
                        className="size-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ to move</span>
            <span>↵ to open</span>
            <span className="ml-auto">⌘K anywhere</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const noop = () => () => {};

/** Visible shortcut hint for the nav. Shows ⌘K on Apple devices and Ctrl K elsewhere (after hydration). */
export function PaletteHint({ className }: { className?: string }) {
  const isMac = useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search and commands"
      aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-card px-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:border-indigo/45 hover:text-foreground",
        className,
      )}
    >
      <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
      <span className="hidden lg:inline">Search</span>
      <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[11px] leading-4">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
