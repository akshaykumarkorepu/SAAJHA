"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// One IntersectionObserver for every <Reveal>. Content is visible in the
// server HTML; it is only hidden once <RevealObserver> marks <html data-motion>,
// so nothing disappears if JS fails. Reduced motion is handled in globals.css.

let observer: IntersectionObserver | null = null;

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-in", "");
          observer?.unobserve(e.target); // once
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  return observer;
}

export function RevealObserver() {
  useEffect(() => {
    document.documentElement.setAttribute("data-motion", "");
    return () => document.documentElement.removeAttribute("data-motion");
  }, []);
  return null;
}

export function Reveal({
  children,
  index = 0,
  className,
  as: Tag = "div",
  ...rest
}: {
  children?: React.ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal=""
      style={{ "--i": index } as React.CSSProperties}
      className={cn(className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
