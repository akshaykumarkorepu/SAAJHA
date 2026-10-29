"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Award, CheckCircle2, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getBookings } from "@/lib/data";
import { Button } from "@/components/ui/button";
import type { BookingView } from "@/lib/types";

export default function ManagerPage() {
  const [bookings, setBookings] = useState<BookingView[]>([]);

  // Mock badge requests in memory
  const [badgeRequests, setBadgeRequests] = useState([
    {
      id: "req_1",
      user: "Diya Sharma",
      rollNo: "23MEB0A27",
      dept: "Mechanical",
      badge: "3D Printer Trained",
      file: "diya-printer-induction.pdf",
      aiNote: "Mentions Prusa slicer, bed leveling and filament change. Dated Oct 2026.",
      status: "pending",
    },
  ]);

  // Mock incident reports
  const [incidents, setIncidents] = useState([
    {
      id: "inc_1",
      resource: "Canon EOS 90D DSLR Kit",
      borrower: "Aarav Reddy",
      type: "Minor Scratch",
      desc: "Small hairline scratch observed on outer lens cap during return handover.",
      penalty: 1,
      status: "open",
    },
  ]);

  useEffect(() => {
    let ignore = false;
    getBookings()
      .then((data) => {
        if (!ignore) setBookings(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  function handleApproveBadge(id: string) {
    setBadgeRequests((prev) => prev.filter((r) => r.id !== id));
    toast.success("Training badge approved and issued!", {
      description: "Added to student's Skill Passport with immediate equipment access.",
    });
  }

  function handleResolveIncident(id: string) {
    setIncidents((prev) => prev.filter((i) => i.id !== id));
    toast.success("Incident resolved and penalty recorded.", {
      description: "Audit ledger updated with resolution note.",
    });
  }

  const overdueBookings = bookings.filter((b) => b.status === "overdue");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-page">Department Manager Desk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Academic section & department administration: verify induction credentials, adjudicate incidents, and manage campus compliance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Badge Requests Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Award className="size-5 text-indigo" /> Pending Badge Inductions
            </h2>
            <span className="text-xs text-muted-foreground">{badgeRequests.length} pending</span>
          </div>

          {badgeRequests.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="mx-auto size-5 text-success mb-2" />
              All badge induction requests have been reviewed!
            </div>
          ) : (
            <div className="space-y-3">
              {badgeRequests.map((req) => (
                <div key={req.id} className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{req.badge}</h3>
                      <p className="text-xs text-muted-foreground">
                        {req.user} · {req.dept} ({req.rollNo})
                      </p>
                    </div>
                    <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-medium text-warning-ink">
                      Verification Needed
                    </span>
                  </div>

                  <div className="rounded-xl border border-indigo/20 bg-indigo-soft/30 p-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-indigo">
                      <Sparkles className="size-3.5" /> AI Pre-check Note
                    </span>
                    <p className="mt-1 text-muted-foreground">{req.aiNote}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-line/60">
                    <Button size="sm" className="h-8 text-xs bg-success text-white hover:bg-success/90" onClick={() => handleApproveBadge(req.id)}>
                      Approve & Issue Badge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Incidents & Handover Review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning-ink" /> Incident Queue
            </h2>
            <span className="text-xs text-muted-foreground">{incidents.length} open</span>
          </div>

          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-6 text-center text-xs text-muted-foreground">
              <ShieldCheck className="mx-auto size-5 text-success mb-2" />
              No open damage or misuse incidents recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{inc.resource}</h3>
                      <p className="text-xs text-muted-foreground">
                        Reported on borrower: <strong>{inc.borrower}</strong>
                      </p>
                    </div>
                    <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-medium text-danger-ink">
                      {inc.type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">{inc.desc}</p>

                  <div className="flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="text-xs text-muted-foreground">
                      Penalty: <strong>{inc.penalty} credit deduction</strong>
                    </span>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleResolveIncident(inc.id)}>
                      Resolve with Warning
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Monitoring */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="size-5 text-danger" /> Overdue Equipment Tracking
        </h2>
        {overdueBookings.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-center text-xs text-muted-foreground">
            No overdue returns detected across campus labs.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {overdueBookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{b.resource.name}</span>
                  <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] text-white font-medium">Overdue</span>
                </div>
                <p className="mt-1 text-muted-foreground">Borrower: {b.borrower.full_name} ({b.borrower.department})</p>
                <p className="mt-2 text-[11px] text-danger-ink">Due since: {new Date(b.ends_at).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
