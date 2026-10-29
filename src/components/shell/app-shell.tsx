"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, ChevronDown, LogOut, Menu, Repeat } from "lucide-react";
import { setDemoRole } from "@/lib/demo-session";
import { track } from "@/lib/judge";
import type { DemoRole } from "@/lib/types";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/saajha/logo";
import { ThemeToggle } from "@/components/saajha/theme";
import { PaletteHint } from "@/components/saajha/command-palette";
import { NAV_BY_ROLE, ROLE_LABEL } from "./nav-config";
import { NotificationBell } from "./notification-bell";
import { useSession } from "./session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const ROLES = Object.keys(ROLE_LABEL) as DemoRole[];

function initials(name: string) {
  return name
    .replace(/^(Dr|Prof)\.\s*/, "")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

function useSwitchRole() {
  const router = useRouter();
  return async (role: DemoRole | null) => {
    if (role === null && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        if (supabase) await supabase.auth.signOut();
      } catch {}
    }
    setDemoRole(role);
    if (role) track("switched_role");
    if (role) {
      toast.success(`Now viewing as ${ROLE_LABEL[role]}`);
      router.push("/explore");
    } else {
      toast("Signed out");
      router.push("/login");
    }
  };
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/") || (href === "/explore" && pathname.startsWith("/resources"));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, profile } = useSession();
  const pathname = usePathname();
  const switchRole = useSwitchRole();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const links = NAV_BY_ROLE[role];

  useEffect(() => {
    const onScroll = () => setScrolled((prev) => ((window.scrollY > 4) !== prev ? !prev : prev));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header
        className={cn(
          "enter-fade sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md transition-[border-color,box-shadow] duration-300",
          scrolled ? "border-line shadow-[0_8px_24px_-16px_rgb(0_0_0/0.25)]" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          <Link href="/explore" aria-label="Saajha, explore resources" className="mr-4 rounded-md">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className="relative rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-surface-2/70 hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                >
                  {l.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      transition={transition.spring}
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-marigold"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <PaletteHint className="mr-1" />
            <NotificationBell />
            <ThemeToggle />

            {/* Role badge + switch-role menu (desktop) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" className="ml-1 hidden h-10 gap-2 rounded-full pr-2.5 pl-1 md:inline-flex" />}
              >
                <span className="grid size-8 place-items-center rounded-full bg-indigo text-xs font-semibold text-primary-foreground">
                  {initials(profile.full_name)}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{profile.full_name}</span>
                  <span className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]} · demo</span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1.5">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-1.5 px-2">
                    <Repeat className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Switch role
                  </DropdownMenuLabel>
                  {ROLES.map((r) => (
                    <DropdownMenuItem key={r} onClick={() => r !== role && switchRole(r)} className="px-2 py-1.5">
                      <span className="flex-1">{ROLE_LABEL[r]}</span>
                      {r === role && <Check className="size-4 text-indigo" strokeWidth={1.75} aria-label="current" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => switchRole(null)} className="px-2 py-1.5">
                  <LogOut strokeWidth={1.75} aria-hidden="true" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}>
                <Menu strokeWidth={1.75} />
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] gap-0 p-0">
                <SheetHeader className="border-b p-4">
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-3 border-b p-4">
                  <span className="grid size-10 place-items-center rounded-full bg-indigo text-sm font-semibold text-primary-foreground">
                    {initials(profile.full_name)}
                  </span>
                  <div className="leading-tight">
                    <p className="font-medium">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]} · demo</p>
                  </div>
                </div>
                <nav aria-label="Main" className="flex flex-col p-2">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, l.href) ? "page" : undefined}
                      className="rounded-md px-3 py-2.5 text-[15px] hover:bg-muted aria-[current=page]:bg-indigo-soft aria-[current=page]:font-medium aria-[current=page]:text-indigo"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
                <div className="border-t p-2">
                  <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Switch role</p>
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {ROLES.map((r) => (
                      <Button
                        key={r}
                        variant={r === role ? "secondary" : "ghost"}
                        className="h-9 justify-start"
                        aria-pressed={r === role}
                        onClick={() => {
                          setOpen(false);
                          if (r !== role) switchRole(r);
                        }}
                      >
                        {ROLE_LABEL[r]}
                      </Button>
                    ))}
                  </div>
                  <Button variant="ghost" className="mt-1 h-9 w-full justify-start" onClick={() => switchRole(null)}>
                    <LogOut data-icon="inline-start" strokeWidth={1.75} /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main" className="relative mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div aria-hidden="true" data-anim="" className="ambient pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[420px] [mask-image:linear-gradient(black,transparent)] [animation:drift_52s_var(--ease-in-out)_infinite]" />
        {children}
      </main>
    </>
  );
}
