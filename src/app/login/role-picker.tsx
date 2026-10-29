"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Building2, FlaskConical, Gavel, GraduationCap, ScrollText, UserRoundX, type LucideIcon } from "lucide-react";
import { setDemoRole } from "@/lib/demo-session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DemoAccount, DemoRole } from "@/lib/types";
import { fadeUp } from "@/lib/motion";

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

  async function choose(a: DemoAccount) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        if (supabase) {
          const { error } = await supabase.auth.signInWithPassword({
            email: a.profile.email,
            password: "Demo@1234",
          });
          if (error) {
            console.warn("Supabase Auth signIn note:", error.message);
          } else {
            toast.success(`Supabase Auth Session Active`, {
              description: `Authenticated as ${a.profile.email}`,
            });
          }
        }
      } catch (err) {
        console.warn("Supabase signin attempt failed:", err);
      }
    }
    setDemoRole(a.key);
    toast.success(`Signed in as ${a.profile.full_name}`, { description: `${a.label}` });
    router.push("/explore");
  }

  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {accounts.map((a, i) => {
        const Icon = ICONS[a.key];
        return (
          <motion.li
            key={a.key}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={i + 2}
          >
            <button
              type="button"
              onClick={() => choose(a)}
              className="group card-lift flex h-full w-full items-start gap-4 rounded-2xl border border-line bg-card p-4 text-left"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-soft text-indigo transition-colors duration-300 group-hover:bg-marigold-soft group-hover:text-warning-ink">
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
