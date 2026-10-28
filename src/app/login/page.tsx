import type { Metadata } from "next";
import Link from "next/link";
import { getDemoAccounts } from "@/lib/data";
import { Logo } from "@/components/saajha/logo";
import { ThemeToggle } from "@/components/saajha/theme";
import { RolePicker } from "./role-picker";
import { TrustFacts } from "./trust-facts";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const accounts = await getDemoAccounts();
  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel */}
      <section className="relative flex flex-col justify-between gap-8 overflow-hidden bg-indigo px-4 py-6 text-primary-foreground sm:px-8 dark:bg-indigo-soft dark:text-foreground lg:px-12 lg:py-10">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-40 invert dark:invert-0" aria-hidden="true" />
        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="Saajha home" className="rounded-md">
            <Logo tile wordmarkClassName="text-primary-foreground dark:text-foreground" />
          </Link>
        </div>
        <div className="relative hidden lg:block">
          <h1 className="text-5xl leading-[1.05]">
            Idle labs,
            <br />
            shared with trust.
          </h1>
          <p className="mt-4 max-w-sm opacity-85">
            Pick who you want to be. Each demo role sees the same campus from a different side.
          </p>
        </div>
        <TrustFacts />
      </section>

      {/* Role cards */}
      <section className="flex flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-2xl flex-1 lg:pt-8">
          <h2 className="text-3xl sm:text-4xl">Choose a demo role</h2>
          <p className="mt-2 text-muted-foreground">
            One click, no password. Every account and booking here is fictional.
          </p>
          <RolePicker accounts={accounts} />
          <p className="mt-8 text-sm text-muted-foreground">
            Real sign-in with your institute email arrives with the Supabase backend.
          </p>
        </div>
      </section>
    </main>
  );
}
