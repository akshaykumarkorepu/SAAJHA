import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/saajha/logo";
import { ThemeToggle } from "@/components/saajha/theme";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Saajha home" className="rounded-md">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="#how" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline-block">
            How it works
          </Link>
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-9 px-4" })}>
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/70">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo wordmarkClassName="text-base" />
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>साझा: shared, jointly owned</span>
        </div>
        <p>
          Built by Team CTRL + AI for Code Conqueror India 2026. All data shown is fictional.
        </p>
      </div>
    </footer>
  );
}
