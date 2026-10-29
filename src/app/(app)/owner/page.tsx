"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/shell/session";
import { decideBooking, getBookings, getResources } from "@/lib/data";
import { StatusChip } from "@/components/saajha/status-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HandoverModal } from "@/components/bookings/handover-modal";
import { formatSlot } from "@/lib/slots";
import type { BookingView, ResourceView } from "@/lib/types";

export default function OwnerPage() {
  const { profile } = useSession();
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [resources, setResources] = useState<ResourceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Rejection dialog state
  const [rejectingBooking, setRejectingBooking] = useState<BookingView | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Handover modal state
  const [handoverBooking, setHandoverBooking] = useState<BookingView | null>(null);
  const [handoverStage, setHandoverStage] = useState<"check_out" | "return">("check_out");
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      getBookings({ ownerId: profile.id }),
      getResources(profile.id),
    ])
      .then(([allBookings, allRes]) => {
        if (!ignore) {
          setBookings(allBookings);
          setResources(allRes.filter((r) => r.owner.id === profile.id || profile.role === "admin"));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [profile.id, profile.role, version]);

  function refresh() {
    setLoading(true);
    setVersion((v) => v + 1);
  }

  const pendingRequests = bookings.filter((b) => b.status === "requested");
  const activeBookings = bookings.filter((b) => ["approved", "checked_out", "overdue"].includes(b.status));

  async function handleApprove(booking: BookingView) {
    setSubmittingDecision(true);
    try {
      await decideBooking(booking.id, profile.id, "approved", "Approved by lab in-charge");
      toast.success("Booking request approved!", {
        description: `Notification sent to ${booking.borrower.full_name}.`,
      });
      refresh();
    } catch (e) {
      toast.error("Failed to approve", { description: (e as Error).message });
    } finally {
      setSubmittingDecision(false);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectingBooking) return;
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason required", { description: "Please explain why this request cannot be approved." });
      return;
    }

    setSubmittingDecision(true);
    try {
      await decideBooking(rejectingBooking.id, profile.id, "rejected", rejectionReason);
      toast.success("Booking rejected", { description: "Borrower notified with the reason." });
      setRejectingBooking(null);
      setRejectionReason("");
      refresh();
    } catch (e) {
      toast.error("Failed to reject", { description: (e as Error).message });
    } finally {
      setSubmittingDecision(false);
    }
  }

  function openHandover(booking: BookingView, stage: "check_out" | "return") {
    setHandoverBooking(booking);
    setHandoverStage(stage);
    setIsHandoverOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page">Lab In-Charge Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.department ?? "Lab Management"} · Oversee equipment readiness, requests, and handovers.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-xs">
            <span className="size-2 rounded-full bg-warning-ink animate-pulse" />
            <span><strong>{pendingRequests.length}</strong> Pending Review</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-xs">
            <span className="size-2 rounded-full bg-success" />
            <span><strong>{activeBookings.length}</strong> In Circulation</span>
          </div>
        </div>
      </div>

      {/* Section 1: Pending Requests Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Requests Awaiting Approval</h2>
          <span className="text-xs text-muted-foreground">All checks passed before arriving here</span>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl border border-line bg-card/60" />
        ) : pendingRequests.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" />
            <span>All caught up! No requests currently waiting for your review.</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-line bg-card p-5 shadow-card transition-shadow hover:shadow-pop"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={b.status} />
                      <span className="font-semibold text-foreground">{b.resource.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3.5 text-indigo" />
                      <span>{formatSlot(b)}</span>
                    </div>
                    <div className="rounded-xl border border-line/60 bg-muted/40 p-3 text-xs">
                      <span className="font-semibold text-muted-foreground">Purpose stated: </span>
                      <span className="text-foreground">{b.purpose}</span>
                    </div>
                  </div>

                  {/* Borrower Card */}
                  <div className="flex shrink-0 flex-col gap-1 rounded-xl border border-line bg-surface p-3 text-xs sm:w-60">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="size-3.5 text-indigo" /> Borrower Profile
                    </span>
                    <span className="font-semibold text-foreground">{b.borrower.full_name}</span>
                    <span className="text-muted-foreground">{b.borrower.department} · {b.borrower.roll_no}</span>
                    <div className="mt-1 flex items-center justify-between border-t border-line/60 pt-1 text-[11px]">
                      <span className="text-muted-foreground">Reliability Score:</span>
                      <span className="font-semibold text-success">{b.borrower.reliability}%</span>
                    </div>
                  </div>
                </div>

                {/* Approval & Rejection buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 border-danger/30 text-xs text-danger-ink hover:bg-danger-soft"
                    onClick={() => {
                      setRejectingBooking(b);
                      setRejectionReason("");
                    }}
                    disabled={submittingDecision}
                  >
                    <XCircle className="size-3.5" /> Reject with Reason
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 bg-success text-xs text-white hover:bg-success/90"
                    onClick={() => handleApprove(b)}
                    disabled={submittingDecision}
                  >
                    <CheckCircle2 className="size-3.5" /> Approve Request
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Active Handover & In-Circulation */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Bookings & Handover Queue</h2>
        {activeBookings.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-center text-xs text-muted-foreground">
            No equipment currently checked out or awaiting return.
          </div>
        ) : (
          <div className="grid gap-3">
            {activeBookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-card p-4 text-xs sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={b.status} />
                    <span className="font-semibold text-foreground">{b.resource.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{b.borrower.full_name} ({b.borrower.department})</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{formatSlot(b)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {b.status === "approved" && (
                    <Button
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => openHandover(b, "check_out")}
                    >
                      Confirm Check-out
                    </Button>
                  )}
                  {(b.status === "checked_out" || b.status === "overdue") && (
                    <Button
                      size="sm"
                      className="h-7 text-[11px] bg-success text-white hover:bg-success/90"
                      onClick={() => openHandover(b, "return")}
                    >
                      Confirm Return
                    </Button>
                  )}
                  <Link href={`/bookings/${b.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-[11px]">
                      Timeline
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Managed Resources */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Managed Lab Resources</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">{r.name}</span>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success-ink uppercase">
                  {r.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted-foreground">
                <span>{r.location}</span>
                <span>Max {r.max_hours}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Rejection Reason Dialog */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setRejectingBooking(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-pop">
            <div className="flex items-center gap-2 text-danger-ink">
              <ShieldAlert className="size-5" />
              <h3 className="text-lg font-semibold">Reason for Rejection Required</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Under Saajha&apos;s fair-sharing policy, every rejected request must include a clear explanation and next steps for the borrower.
            </p>

            <div className="mt-4">
              <Textarea
                placeholder="e.g., Resource is reserved for semester exam calibration, or missing prerequisite workshop..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="h-24 text-sm"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectingBooking(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-danger text-white hover:bg-danger/90"
                onClick={handleRejectSubmit}
                disabled={submittingDecision || !rejectionReason.trim()}
              >
                {submittingDecision ? "Saving..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {handoverBooking && (
        <HandoverModal
          booking={handoverBooking}
          stage={handoverStage}
          isOpen={isHandoverOpen}
          onClose={() => setIsHandoverOpen(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
