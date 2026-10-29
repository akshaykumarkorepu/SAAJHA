"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Mail, Loader2, KeyRound } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { setDemoRole } from "@/lib/demo-session";
import type { DemoRole } from "@/lib/types";

export function EmailLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isConfigured = isSupabaseConfigured();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    if (!isConfigured) {
      toast.error("Supabase not configured", {
        description: "Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable real database logins.",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Could not initialize Supabase client.");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error("Authentication failed", { description: error.message });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Query user's profile role from public.profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .or(`id.eq.${data.user.id},email.eq.${data.user.email}`)
          .maybeSingle();

        let role: DemoRole = "student";
        if (profile?.role === "owner") role = "owner";
        else if (profile?.role === "manager") role = "manager";
        else if (profile?.role === "admin") role = "admin";
        else if (data.user.email === "student2@saajha.demo") role = "student2";
        else if (data.user.email === "partner@saajha.demo") role = "partner";

        setDemoRole(role);
        toast.success(`Signed in as ${profile?.full_name ?? data.user.email}`, {
          description: "Real Supabase session active.",
        });
        router.push("/explore");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Sign-in error", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-card/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-indigo" />
          <h3 className="text-sm font-semibold text-foreground">Institute Supabase Auth Sign-In</h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-indigo hover:underline"
        >
          {expanded ? "Hide Form" : "Enter Email & Password"}
        </button>
      </div>

      {expanded && (
        <form onSubmit={handleLogin} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Institute Email</label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. student@saajha.demo"
                className="w-full rounded-lg border border-line bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-indigo focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">Password</label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (Demo accounts use Demo@1234)"
                className="w-full rounded-lg border border-line bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-indigo focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Sign In with Supabase
          </button>
        </form>
      )}
    </div>
  );
}

