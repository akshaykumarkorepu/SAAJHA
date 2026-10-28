"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "saajha.theme";
type Theme = "light" | "dark";

/** Stored choice, else the OS preference. Serialised into <head> to run before first paint. */
function applyStoredTheme(key: string) {
  try {
    let t = localStorage.getItem(key);
    if (t !== "light" && t !== "dark") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  } catch {}
}

export const THEME_SCRIPT = `(${applyStoredTheme.toString()})(${JSON.stringify(KEY)})`;

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}

/** Re-applies the theme after React's dev-mode remount clears <html> attributes. */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyStoredTheme(KEY);
  }, []);
  return null;
}

/**
 * Switch theme. With View Transitions, the new theme grows as a circle from `origin`
 * (the toggle button); otherwise, or with reduced motion, it switches instantly.
 */
export function toggleTheme(origin?: { x: number; y: number }) {
  const next: Theme = current() === "dark" ? "light" : "dark";
  const apply = () => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("startViewTransition" in document)) return apply();
  const vt = document.startViewTransition(apply);
  const x = origin?.x ?? innerWidth / 2;
  const y = origin?.y ?? innerHeight / 2;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  vt.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    )
    .catch(() => {});
}

export function ThemeToggle() {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        toggleTheme({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
      }}
    >
      <span className="relative grid size-4 place-items-center">
        <Sun strokeWidth={1.75} className="absolute scale-50 -rotate-90 opacity-0 transition-all duration-300 ease-(--ease-out) dark:scale-100 dark:rotate-0 dark:opacity-100" />
        <Moon strokeWidth={1.75} className="absolute transition-all duration-300 ease-(--ease-out) dark:scale-50 dark:rotate-90 dark:opacity-0" />
      </span>
    </Button>
  );
}
