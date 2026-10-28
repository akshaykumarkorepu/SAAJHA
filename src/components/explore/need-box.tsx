"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { matchNeed } from "@/lib/data";
import type { ResourceView } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/saajha/category-icon";
import { useSession } from "@/components/shell/session";

type Match = { resource: ResourceView; reason: string };

export function NeedBox() {
  const { profile } = useSession();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      setMatches(await matchNeed(text, profile.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5" aria-labelledby="need-title">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label id="need-title" htmlFor="need" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Sparkles className="size-4 text-warning-ink" strokeWidth={1.75} aria-hidden="true" />
          Describe what you need
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            id="need"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="e.g. I need to record a club event on Saturday evening"
            className="min-h-10 flex-1 resize-none"
          />
          <Button type="submit" disabled={busy || !text.trim()} className="h-10 px-4 active:scale-[0.98]">
            {busy ? "Matching…" : "Suggest"}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        <AnimatePresence>
          {matches && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="mt-4 text-xs text-muted-foreground">
                ✦ Suggestion preview (keyword match until AI matching is connected) · a person makes the final call
              </p>
              {matches.length === 0 ? (
                <p className="mt-2 text-sm">
                  Nothing obvious matched. Try naming the task, like &quot;3D print a part&quot; or &quot;room for 6 people&quot;.
                </p>
              ) : (
                <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                  {matches.map(({ resource: r, reason }) => (
                    <li key={r.id}>
                      <Link
                        href={`/resources/${r.id}`}
                        className="group flex h-full items-start gap-3 rounded-xl border bg-background p-3 hover:border-indigo"
                      >
                        <CategoryIcon category={r.category} className="mt-0.5 size-5 shrink-0 text-indigo" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium group-hover:text-indigo">{r.name}</span>
                          <span className="block text-xs text-muted-foreground">{reason}</span>
                        </span>
                        <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
