"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Clock, FileUp, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/shell/session";
import { getBadges, getUserBadges } from "@/lib/data";
import { Button } from "@/components/ui/button";
import type { Badge, UserBadgeView } from "@/lib/types";

export default function PassportPage() {
  const { profile } = useSession();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingBadgeId, setUploadingBadgeId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBadges(), getUserBadges(profile.id)])
      .then(([badges, userB]) => {
        setAllBadges(badges);
        setUserBadges(userB);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [profile.id]);

  function handleUploadCertificate(badge: Badge) {
    setUploadingBadgeId(badge.id);
    setTimeout(() => {
      setUploadingBadgeId(null);
      toast.success("Certificate uploaded for review!", {
        description: `Your certificate for "${badge.name}" has been forwarded to the department manager desk.`,
      });
    }, 1200);
  }

  const UNLOCKS: Record<string, string[]> = {
    PRINTER_3D: ["Prusa MK4 3D Printer"],
    SCOPE_BASIC: ["Rigol DS1054Z Oscilloscope"],
    LAB_SAFETY_1: ["Prusa MK4 3D Printer", "Soldering Station (Hakko FX-888D)"],
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-page">Skill Passport</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified lab inductions and safety credentials. Passports unlock advanced equipment without repeating basic training.
        </p>
      </div>

      {/* Student Passport Card */}
      <div className="rounded-2xl border border-indigo/20 bg-linear-to-br from-indigo-soft/50 via-card to-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-indigo text-primary-foreground shadow-xs">
              <Shield className="size-6" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">{profile.full_name}</h2>
              <p className="text-xs text-muted-foreground">
                {profile.department ?? "General"} · Roll No: {profile.roll_no ?? profile.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-line bg-surface px-4 py-2 text-center text-xs">
              <span className="text-muted-foreground block text-[10px]">Reliability</span>
              <span className="font-bold text-success text-base">{profile.reliability}%</span>
            </div>
            <div className="rounded-xl border border-line bg-surface px-4 py-2 text-center text-xs">
              <span className="text-muted-foreground block text-[10px]">Weekly Credits</span>
              <span className="font-bold text-indigo text-base">{profile.weekly_credits}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Training Badges & Credentials</h2>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBadges.map((badge) => {
              const userBadge = userBadges.find((ub) => ub.badge_id === badge.id);
              const isActive = userBadge?.status === "active";
              const isPending = userBadge?.status === "pending";
              const unlockedEquipment = UNLOCKS[badge.code] ?? [];

              return (
                <div
                  key={badge.id}
                  className="flex flex-col justify-between rounded-2xl border border-line bg-card p-5 shadow-card transition-shadow hover:shadow-pop"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-xl bg-indigo-soft text-indigo">
                        <Award className="size-5" />
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-ink">
                          <CheckCircle2 className="size-3" /> Active
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-ink">
                          <Clock className="size-3" /> Under Review
                        </span>
                      )}
                      {!userBadge && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Not Earned
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display font-semibold text-foreground">{badge.name}</h3>
                      <span className="font-mono text-[10px] text-muted-foreground">{badge.code}</span>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{badge.description}</p>
                    </div>

                    {unlockedEquipment.length > 0 && (
                      <div className="border-t border-line/60 pt-2 text-[11px]">
                        <span className="text-muted-foreground">Unlocks: </span>
                        <span className="font-medium text-foreground">{unlockedEquipment.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60">
                    {isActive ? (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="size-3 text-success" /> Verified by Dean (Academic)
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 gap-1.5 text-xs"
                        onClick={() => handleUploadCertificate(badge)}
                        disabled={uploadingBadgeId === badge.id || isPending}
                      >
                        <FileUp className="size-3.5" />
                        {isPending
                          ? "Certificate Submitted"
                          : uploadingBadgeId === badge.id
                          ? "Uploading..."
                          : "Upload Certificate"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
