import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted after:absolute after:inset-0 after:-translate-x-full after:bg-linear-to-r after:from-transparent after:via-white/45 after:to-transparent after:[animation:shimmer_1.6s_var(--ease-in-out)_infinite] dark:after:via-white/6 motion-reduce:after:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
