"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Building2, FlaskConical, Gavel, GraduationCap, ScrollText, UserRoundX, type LucideIcon } from "lucide-react";
import { setDemoRole } from "@/lib/demo-session";
import type { DemoAccount, DemoRole } from "@/lib/types";
import { EASE } from "@/components/saajha/page-transition";

const ICONS: Record<DemoRole, LucideIcon> = {
  student: GraduationCap,
  student2: UserRoundX,
  partner: Building2,
  owner: FlaskConical,
  manager: Gavel,
  admin: ScrollText,
};

export function RolePicker({ accounts }: { accounts: DemoAccount[] }) {
  const router = useRouter();

  function choose(a: DemoAccount) {
    setDemoRole(a.key);
    toast.success(`Signed in as ${a.profile.full_name}`, { description: `${a.label} (demo account)` });
    router.push("/explore");
  }

  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {accounts.map((a, i) => {
        const Icon = ICONS[a.key];
        return (
          <motion.li
            key={a.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: i * 0.04 }}
          >
            <button
              type="button"
              onClick={() => choose(a)}
              className="group card-lift flex h-full w-full items-start gap-4 rounded-2xl border bg-card p-4 text-left active:scale-[0.98]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-soft text-indigo transition-colors group-hover:bg-marigold-soft group-hover:text-warning-ink">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold">{a.label}</span>
                  <ArrowRight
                    className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{a.blurb}</span>
                <span className="mt-2 block truncate font-mono text-xs text-muted-foreground">{a.profile.email}</span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
