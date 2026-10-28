import Link from "next/link";
import { Hammer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/saajha/empty-state";

/** Placeholder for routes planned in CLAUDE.md §8 but not built yet. */
export function ComingNext({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <EmptyState
        icon={Hammer}
        title="Coming in the next build"
        body={body}
        action={
          <Link href="/explore" className={buttonVariants()}>
            Explore resources
          </Link>
        }
      />
    </div>
  );
}
