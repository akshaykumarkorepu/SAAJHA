import { cn } from "@/lib/utils";

/** Two overlapping rounded squares: two parties sharing one thing. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect x="2" y="2" width="19" height="19" rx="5.5" fill="var(--indigo)" />
      <rect x="11" y="11" width="19" height="19" rx="5.5" fill="var(--marigold)" />
      {/* the shared part */}
      <path d="M11 16.5a5.5 5.5 0 0 1 5.5-5.5H21v4.5a5.5 5.5 0 0 1-5.5 5.5H11z" fill="#B5652A" />
    </svg>
  );
}

export function Logo({
  className,
  wordmarkClassName,
  tile,
}: {
  className?: string;
  wordmarkClassName?: string;
  /** Put the mark on a paper tile, for use on coloured panels. */
  tile?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {tile ? (
        <span className="grid size-9 place-items-center rounded-xl bg-paper">
          <LogoMark className="size-6" />
        </span>
      ) : (
        <LogoMark />
      )}
      <span className={cn("font-display text-xl font-semibold tracking-tight text-foreground", wordmarkClassName)}>
        Saajha
      </span>
    </span>
  );
}
