"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Inbox, LogIn, LogOut } from "lucide-react";
import { useSession } from "@/components/shell/session";
import { getBookings } from "@/lib/data";
import { StatusChip } from "@/components/saajha/status-chip";
import { Button } from "@/components/ui/button";
import { HandoverModal } from "@/components/bookings/handover-modal";
import { formatSlot } from "@/lib/slots";
import type { BookingStatus, BookingView } from "@/lib/types";

export default function BookingsPage() {
  const { profile } = useSession();
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "past">("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingView | null>(null);
  const [modalStage, setModalStage] = useState<"check_out" | "return">("check_out");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getBookings({ borrowerId: profile.id })
      .then((data) => {
        if (!ignore) {
          setBookings(data);
          setLoading(false);
          setFetchError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setLoading(false);
          setFetchError(err instanceof Error ? err.message : "Failed to load bookings.");
        }
      });
    return () => {
      ignore = true;
    };
  }, [profile.id, version]);

  function refresh() {
    setLoading(true);
    setVersion((v) => v + 1);
  }

  const activeStatuses: BookingStatus[] = ["requested", "waitlisted", "approved", "checked_out", "overdue"];
  const pastStatuses: BookingStatus[] = ["returned", "completed", "cancelled", "rejected"];

  const filtered = bookings.filter((b) => {
    if (tab === "active") return activeStatuses.includes(b.status);
    if (tab === "past") return pastStatuses.includes(b.status);
    return true;
  });

  function openHandover(booking: BookingView, stage: "check_out" | "return") {
    setSelectedBooking(booking);
    setModalStage(stage);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track requests, checkouts and returns. Every action is sealed in the audit ledger.
          </p>
        </div>
        <Link href="/explore">
          <Button variant="outline" className="h-9 gap-1.5 text-xs">
            Book another resource <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-line pb-3">
        {[
          ["all", "All Bookings"],
          ["active", "Active & Upcoming"],
          ["past", "Past & History"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as "all" | "active" | "past")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === key
                ? "bg-indigo text-primary-foreground shadow-xs"
                : "bg-surface text-muted-foreground hover:bg-muted"
            }`}
          >
            {label} ({bookings.filter((b) => {
              if (key === "active") return activeStatuses.includes(b.status);
              if (key === "past") return pastStatuses.includes(b.status);
              return true;
            }).length})
          </button>
        ))}
      </div>

      {/* Error alert if backend request fails */}
      {fetchError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger-ink">
          <p className="font-medium">Could not load bookings from database</p>
          <p className="mt-1 font-mono text-xs opacity-90 break-words">{fetchError}</p>
          <button
            onClick={refresh}
            className="mt-3 rounded-md border border-line bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-card/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line p-12 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="size-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold">No bookings found</h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {tab === "active"
              ? "You have no active or pending requests at the moment."
              : "Discover equipment or rooms across NIT Warangal and make your first booking."}
          </p>
          <Link href="/explore" className="mt-4">
            <Button size="sm">Explore resources</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-card p-5 shadow-card transition-shadow hover:shadow-pop sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={b.status} />
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground">{b.resource.location}</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {b.resource.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    Purpose: <span className="text-foreground">{b.purpose}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-indigo" />
                    {formatSlot(b)}
                  </span>
                  {b.decision_reason && (
                    <span className="flex items-center gap-1 text-warning-ink">
                      Note: {b.decision_reason}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:self-center">
                {b.status === "approved" && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-indigo text-xs text-primary-foreground hover:bg-indigo/90"
                    onClick={() => openHandover(b, "check_out")}
                  >
                    <LogIn className="size-3.5" /> Check out
                  </Button>
                )}
                {(b.status === "checked_out" || b.status === "overdue") && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-success text-xs text-white hover:bg-success/90"
                    onClick={() => openHandover(b, "return")}
                  >
                    <LogOut className="size-3.5" /> Return equipment
                  </Button>
                )}
                <Link href={`/bookings/${b.id}`}>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                    Timeline <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Handover Modal */}
      {selectedBooking && (
        <HandoverModal
          booking={selectedBooking}
          stage={modalStage}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
