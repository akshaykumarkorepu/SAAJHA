"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, UserRoundX } from "lucide-react";
import { getDemoProfile, getResources, runReadinessCheck } from "@/lib/data";
import { track } from "@/lib/judge";
import { formatSlot, makeSlot } from "@/lib/slots";
import type { DemoRole, ReadinessResult, ResourceView, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CategoryIcon } from "@/components/saajha/category-icon";
import { Segmented } from "@/components/saajha/segmented";
import { ReadinessPanel } from "@/components/resource/readiness-panel";

type Persona = Extract<DemoRole, "student" | "student2" | "partner">;
type SlotMode = "free" | "busy";

const PERSONAS: { value: Persona; label: string; icon: React.ReactNode; blurb: string }[] = [
  { value: "student", label: "Student", icon: <GraduationCap className="size-4" strokeWidth={1.75} />, blurb: "Has every training badge." },
  { value: "student2", label: "Student 2", icon: <UserRoundX className="size-4" strokeWidth={1.75} />, blurb: "Still waiting on the 3D-printer badge." },
  { value: "partner", label: "Partner", icon: <Building2 className="size-4" strokeWidth={1.75} />, blurb: "Visiting from Kakatiya Institute." },
];

// Preferred showcase resources per audience (matched by name; partner colleges see a different set).
const FEATURED = ["DSLR", "3D Printer", "Project Room", "Oscilloscope", "Raspberry Pi", "Seminar Hall"];
const SHORT: Record<string, string> = {
  DSLR: "DSLR kit",
  "3D Printer": "3D printer",
  "Project Room": "Project room",
  Oscilloscope: "Oscilloscope",
  "Raspberry Pi": "Pi kit",
  "Seminar Hall": "Seminar hall",
};
const noop = () => {};
const keyOf = (r: ResourceView) => FEATURED.find((k) => r.name.includes(k)) ?? r.name;

/** Landing-page demo: the real readiness_check logic on demo data, for any persona × resource × slot. */
export function ReadinessDemo() {
  const [persona, setPersona] = useState<Persona>("student");
  const [resources, setResources] = useState<ResourceView[] | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [mode, setMode] = useState<SlotMode>("free");
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const profile = getDemoProfile(persona);

  // Load what this persona can actually see.
  useEffect(() => {
    let live = true;
    getResources(profile.id).then((all) => {
      if (!live) return;
      const featured = FEATURED.map((k) => all.find((r) => r.name.includes(k))).filter((r): r is ResourceView => !!r);
      const three = featured.slice(0, 3);
      setResources(three);
      setResourceId((prev) => (prev && three.some((r) => r.id === prev) ? prev : three[0]?.id ?? null));
    });
    return () => {
      live = false;
    };
  }, [profile.id]);

  const resource = resources?.find((r) => r.id === resourceId) ?? null;
  const slot: Slot | null = useMemo(() => {
    if (!resource) return null;
    if (mode === "free") return resource.next_free;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return makeSlot(tomorrow, 14, 2);
  }, [resource, mode]);

  useEffect(() => {
    if (!resource || !slot) return;
    let live = true;
    runReadinessCheck(resource.id, profile.id, slot).then((r) => {
      if (!live) return;
      setResult(r);
      track("landing_demo");
    });
    return () => {
      live = false;
      setResult(null);
    };
  }, [resource, slot, profile.id]);

  const personaMeta = PERSONAS.find((p) => p.value === persona)!;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
      <div className="space-y-5">
        <Segmented label="1 · Who's asking?" options={PERSONAS} value={persona} onChange={setPersona} />
        <p className="-mt-2 text-xs text-muted-foreground">
          {profile.full_name}: {personaMeta.blurb}
        </p>

        <Segmented
          label="2 · What do they want?"
          options={(resources ?? []).map((r) => ({
            value: r.id,
            label: SHORT[keyOf(r)] ?? r.name,
            icon: <CategoryIcon category={r.category} className="size-4" />,
          }))}
          value={resourceId ?? ""}
          onChange={setResourceId}
        />
        {persona === "partner" && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Partner colleges only see what NIT Warangal labs chose to share with them, so the list changed.
          </p>
        )}

        <Segmented
          label="3 · When?"
          options={[
            { value: "free" as SlotMode, label: "Next free slot" },
            { value: "busy" as SlotMode, label: "Tomorrow 2 PM" },
          ]}
          value={mode}
          onChange={setMode}
        />

        {resource && (
          <Link
            href={`/resources/${resource.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "hidden h-10 px-4 lg:inline-flex")}
          >
            Open {resource.name} in the app
            <ArrowRight data-icon="inline-end" strokeWidth={1.75} />
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{resource?.name ?? "Loading…"}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {slot ? formatSlot(slot) : resource ? "No free slot this fortnight" : " "}
            </p>
          </div>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted-foreground">
            Live on demo data
          </span>
        </div>
        <div className="mt-4">
          <ReadinessPanel result={result} onSettled={noop} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          This is the same check that runs inside the app. Try another persona or slot.
        </p>
      </div>
    </div>
  );
}
