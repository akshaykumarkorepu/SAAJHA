import { cn } from "@/lib/utils";

/** Two overlapping rounded squares: two parties sharing one thing. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect x="2" y="2" width="19" height="19" rx="5.5" fill="var(--indigo)" />
      <rect x="11" y="11" width="19" height="19" rx="5.5" fill="var(--marigold)" style={{ mixBlendMode: "multiply" }} />
      <rect x="11" y="11" width="10" height="10" rx="2" fill="var(--ink)" opacity="0.18" />
    </svg>
  );
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold tracking-tight text-foreground", wordmarkClassName)}>
        Saajha
      </span>
    </span>
  );
}
