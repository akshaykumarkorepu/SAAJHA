"use client";

import { useState } from "react";
import { Check, ClipboardCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { checkOutBooking, returnBooking } from "@/lib/data";
import { useSession } from "@/components/shell/session";
import type { BookingView, Condition } from "@/lib/types";

const CONDITIONS: { key: Condition; label: string; desc: string }[] = [
  { key: "excellent", label: "Excellent", desc: "Like new, clean, complete accessories" },
  { key: "good", label: "Good", desc: "Normal cosmetic wear, functions perfectly" },
  { key: "fair", label: "Fair", desc: "Minor issues noted, still usable" },
  { key: "damaged", label: "Damaged", desc: "Requires repair or maintenance inspection" },
];

export function HandoverModal({
  booking,
  stage,
  isOpen,
  onClose,
  onSuccess,
}: {
  booking: BookingView;
  stage: "check_out" | "return";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useSession();
  const [condition, setCondition] = useState<Condition>("good");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    "Accessories present": true,
    "No visible cracks/damage": true,
    "Powers on properly": true,
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isCheckout = stage === "check_out";
  const title = isCheckout ? "Check-out Condition Report" : "Return Handover Report";

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (isCheckout) {
        await checkOutBooking(booking.id, profile.id, condition, checklist, notes);
        toast.success("Equipment checked out successfully!", {
          description: "Condition report logged into the audit ledger.",
        });
      } else {
        await returnBooking(booking.id, profile.id, condition, checklist, notes);
        toast.success("Equipment returned successfully!", {
          description: "Return condition logged. Thank you for sharing with trust.",
        });
      }
      onSuccess();
      onClose();
    } catch (e) {
      toast.error("Failed to submit handover", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-pop sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-soft text-indigo">
              <ClipboardCheck className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">{booking.resource.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Condition selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Equipment Condition
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(c.key)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    condition === c.key
                      ? "border-indigo bg-indigo-soft/40 shadow-xs"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {condition === c.key && <Check className="size-3.5 text-indigo" strokeWidth={2.5} />}
                    {c.label}
                  </span>
                  <span className="mt-1 text-[11px] leading-tight text-muted-foreground">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inspection Checklist
            </label>
            <div className="mt-2 space-y-1.5">
              {Object.entries(checklist).map(([item, checked]) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-line/60 bg-muted/30 p-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecklist({ ...checklist, [item]: e.target.checked })}
                    className="size-4 rounded border-line text-indigo focus:ring-indigo"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Condition Notes & Observations
            </label>
            <Textarea
              placeholder={isCheckout ? "Note any pre-existing scratches or quirks..." : "Note any issues during usage..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 h-20 text-sm"
            />
          </div>

          <div className="rounded-xl border border-indigo/20 bg-indigo-soft/30 p-3 text-xs text-indigo">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="size-3.5" /> Tamper-evident ledger
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              This report will be sealed in the database and linked to the booking audit hash chain.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sealing report..." : isCheckout ? "Confirm Check-out" : "Confirm Return"}
          </Button>
        </div>
      </div>
    </div>
  );
}

