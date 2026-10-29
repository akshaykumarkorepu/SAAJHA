"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, Copy, FileText, Hash, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { getBooking, getBookingAuditEvents } from "@/lib/data";
import { StatusChip } from "@/components/saajha/status-chip";
import { Button } from "@/components/ui/button";
import { formatSlot } from "@/lib/slots";
import type { AuditEvent, BookingView } from "@/lib/types";

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const [booking, setBooking] = useState<BookingView | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBooking(bookingId), getBookingAuditEvents(bookingId)])
      .then(([b, evs]) => {
        setBooking(b);
        setEvents(evs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId]);

  function copyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success("Hash copied to clipboard", { description: "You can verify this against the ledger." });
    setTimeout(() => setCopiedHash(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-card" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <h2 className="text-lg font-semibold">Booking not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">The requested booking does not exist.</p>
        <Link href="/bookings" className="mt-4 inline-block">
          <Button size="sm">Back to My Bookings</Button>
        </Link>
      </div>
    );
  }

  const checkoutReport = booking.condition_reports?.find((c) => c.stage === "check_out");
  const returnReport = booking.condition_reports?.find((c) => c.stage === "return");

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to My Bookings
        </Link>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-line bg-card p-6 shadow-card sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={booking.status} />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="font-mono text-xs text-muted-foreground">{booking.resource.location}</span>
            </div>
            <h1 className="text-page text-2xl font-bold sm:text-3xl">{booking.resource.name}</h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4 text-indigo" />
              <span>{formatSlot(booking)}</span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-xl border border-line bg-surface p-3 text-xs sm:items-end">
            <span className="text-muted-foreground">Borrower</span>
            <span className="font-medium text-foreground">{booking.borrower.full_name}</span>
            <span className="text-[11px] text-muted-foreground">{booking.borrower.department} · {booking.borrower.roll_no}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</span>
            <p className="mt-1 text-sm">{booking.purpose}</p>
          </div>
          {booking.decision_reason && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decision Note</span>
              <p className="mt-1 text-sm text-foreground">{booking.decision_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Condition Reports (if present) */}
      {(checkoutReport || returnReport) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-indigo" />
            <h2 className="text-xl font-semibold">Handover Condition Reports</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Check out card */}
            <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo">
                  Stage 1 · Check-out
                </span>
                {checkoutReport ? (
                  <span className="rounded-full bg-indigo-soft px-2.5 py-0.5 text-xs font-medium text-indigo capitalize">
                    {checkoutReport.condition}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
              {checkoutReport ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Logged at:</span>{" "}
                    <span className="font-mono">{new Date(checkoutReport.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Notes:</span>{" "}
                    <span className="text-foreground">{checkoutReport.notes || "No notes provided."}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inspection:</span>
                    <ul className="mt-1 space-y-1">
                      {Object.keys(checkoutReport.checklist).map((k) => (
                        <li key={k} className="flex items-center gap-1.5">
                          <Check className="size-3 text-success" />
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">No check-out report submitted yet.</p>
              )}
            </div>

            {/* Return card */}
            <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-success-ink">
                  Stage 2 · Return
                </span>
                {returnReport ? (
                  <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-ink capitalize">
                    {returnReport.condition}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
              {returnReport ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Logged at:</span>{" "}
                    <span className="font-mono">{new Date(returnReport.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Notes:</span>{" "}
                    <span className="text-foreground">{returnReport.notes || "No notes provided."}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inspection:</span>
                    <ul className="mt-1 space-y-1">
                      {Object.keys(returnReport.checklist).map((k) => (
                        <li key={k} className="flex items-center gap-1.5">
                          <Check className="size-3 text-success" />
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">No return report submitted yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tamper-Evident Audit Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-indigo" />
          <h2 className="text-xl font-semibold">Audit Ledger & Hash Timeline</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Every state transition is appended into an immutable, cryptographic SHA-256 chain.
        </p>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-center text-xs text-muted-foreground">
            No audit events recorded yet for this booking.
          </div>
        ) : (
          <div className="relative border-l-2 border-indigo/30 pl-6 space-y-6 ml-3">
            {events.map((ev, index) => (
              <div key={ev.id || index} className="relative group">
                {/* Dot on line */}
                <span className="absolute -left-[31px] top-1.5 size-3.5 rounded-full border-2 border-background bg-indigo" />

                <div className="rounded-2xl border border-line bg-card p-4 shadow-card transition-shadow hover:shadow-pop">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-xs">
                    <span className="font-semibold text-foreground capitalize">
                      {ev.action.replace("booking.", "Action: ")}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="size-3.5 text-indigo" />
                      <span>Actor: <strong className="text-foreground">{ev.actor_id ? "Verified User" : "System"}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Hash className="size-3" />
                        {ev.hash.slice(0, 10)}…{ev.hash.slice(-8)}
                      </span>
                      <button
                        onClick={() => copyHash(ev.hash)}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy full SHA-256 hash"
                      >
                        {copiedHash === ev.hash ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <div className="mt-2 rounded-lg bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(ev.details)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
