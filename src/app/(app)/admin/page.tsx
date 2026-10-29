"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Hash,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getAllAuditEvents, getBookings, getResources, verifyAuditLedger } from "@/lib/data";
import { Button } from "@/components/ui/button";
import type { AuditEvent } from "@/lib/types";

export default function AdminPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    totalEvents: number;
    brokenId?: number;
    message: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalBookings: 0, activeBookings: 0, totalResources: 0 });

  useEffect(() => {
    let ignore = false;
    Promise.all([getAllAuditEvents(), getBookings(), getResources("00000000-0000-4000-a000-000000000106")])
      .then(([evs, bks, res]) => {
        if (!ignore) {
          setEvents(evs);
          setStats({
            totalBookings: bks.length,
            activeBookings: bks.filter((b) => ["approved", "checked_out", "requested"].includes(b.status)).length,
            totalResources: res.length,
          });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await verifyAuditLedger();
      setVerifyResult(res);
      if (res.valid) {
        toast.success("Audit ledger verified intact!", {
          description: res.message,
        });
      } else {
        toast.error("Tamper detected in audit ledger!", {
          description: res.message,
        });
      }
    } catch (e) {
      toast.error("Verification failed", { description: (e as Error).message });
    } finally {
      setVerifying(false);
    }
  }

  function copyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success("Hash copied to clipboard");
    setTimeout(() => setCopiedHash(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page">Admin & Tamper-Evident Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cryptographic audit trail backed by SHA-256 hash chaining and PostgreSQL append-only triggers.
          </p>
        </div>
        <Button
          onClick={handleVerify}
          disabled={verifying}
          className="h-10 gap-2 bg-indigo text-primary-foreground hover:bg-indigo/90 shadow-card"
        >
          {verifying ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {verifying ? "Recomputing chain..." : "Verify Ledger Integrity"}
        </Button>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-5 ${
            verifyResult.valid
              ? "border-success/30 bg-success-soft text-success-ink"
              : "border-danger/30 bg-danger-soft text-danger-ink"
          }`}
        >
          {verifyResult.valid ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {verifyResult.valid ? "Cryptographic Integrity Confirmed" : "Integrity Check Failed"}
            </h3>
            <p className="mt-0.5 text-xs opacity-90">{verifyResult.message}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <span className="text-xs text-muted-foreground">Total Logged Events</span>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">{events.length}</p>
          <span className="text-[11px] text-muted-foreground">Immutable append-only ledger</span>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <span className="text-xs text-muted-foreground">Active Circulation</span>
          <p className="mt-2 text-2xl font-bold font-mono text-indigo">{stats.activeBookings}</p>
          <span className="text-[11px] text-muted-foreground">Requested, approved, or checked out</span>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <span className="text-xs text-muted-foreground">Managed Lab Resources</span>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">{stats.totalResources}</p>
          <span className="text-[11px] text-muted-foreground">Across NIT Warangal departments</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Audit Event Log</h2>
          <span className="font-mono text-xs text-muted-foreground">Ordered by sequence ID (latest first)</span>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-line bg-card/60" />
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-8 text-center text-xs text-muted-foreground">
            No audit events found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4"># ID</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">SHA-256 Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {events.map((ev) => (
                    <tr key={ev.id} className="transition-colors hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono text-muted-foreground">#{ev.id}</td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <span className="rounded-full bg-indigo-soft px-2.5 py-0.5 text-[11px] text-indigo font-mono">
                          {ev.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {ev.entity_type}:{ev.entity_id.slice(-6)}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <Hash className="size-3 text-indigo" />
                          <span>{ev.hash.slice(0, 12)}…{ev.hash.slice(-8)}</span>
                          <button
                            onClick={() => copyHash(ev.hash)}
                            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === ev.hash ? (
                              <Check className="size-3 text-success" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
