"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDemoProfile } from "@/lib/data";
import { useDemoRole } from "@/lib/demo-session";
import type { DemoRole, Profile } from "@/lib/types";

interface Session {
  role: DemoRole;
  profile: Profile;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside <SessionGate>");
  return s;
}

/** Renders children only with a demo role; otherwise sends the visitor to /login. */
export function SessionGate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const role = useDemoRole();
  const router = useRouter();

  useEffect(() => {
    if (role === null) router.replace("/login");
  }, [role, router]);

  if (!role) return fallback;
  return <SessionContext.Provider value={{ role, profile: getDemoProfile(role) }}>{children}</SessionContext.Provider>;
}
