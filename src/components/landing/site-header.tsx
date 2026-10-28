"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/saajha/logo";
import { ThemeToggle } from "@/components/saajha/theme";

const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "trust", label: "Trust in practice" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    // Only re-render when crossing the threshold, not on every scroll event.
    const onScroll = () => setScrolled((prev) => (window.scrollY > 8) !== prev ? !prev : prev);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const hero = document.getElementById("top");
    [hero, ...SECTIONS.map((s) => document.getElementById(s.id))].forEach((el) => el && io.observe(el));
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <header
      className={cn(
        "enter-fade sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ease-(--ease-out)",
        scrolled ? "border-line bg-background/80 shadow-[0_8px_24px_-16px_rgb(0_0_0/0.25)] backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Saajha home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Page sections" className="flex items-center gap-1 sm:gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className="group relative hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground aria-[current=location]:text-foreground md:inline-block"
            >
              {s.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-marigold transition-transform duration-300 ease-(--ease-out) group-hover:scale-x-100 group-aria-[current=location]:scale-x-100"
              />
            </a>
          ))}
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-9 px-4" })}>
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo wordmarkClassName="text-base" />
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>साझा: shared, jointly owned</span>
        </div>
        <p>Built by Team CTRL + AI for Code Conqueror India 2026. All data shown is fictional.</p>
      </div>
    </footer>
  );
}
