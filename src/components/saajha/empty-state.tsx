import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Icon + one friendly line + a primary action. Never a blank page (DESIGN.md §4). */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-indigo-soft text-indigo">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="text-xl">{title}</h2>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
