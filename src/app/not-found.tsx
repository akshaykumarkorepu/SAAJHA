import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PaletteHint } from "@/components/saajha/command-palette";
import { Logo } from "@/components/saajha/logo";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="relative grid flex-1 place-items-center overflow-hidden px-4 py-24">
      <div aria-hidden="true" className="ambient pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
      <div className="max-w-md text-center">
        <Link href="/" aria-label="Saajha home" className="enter inline-block rounded-md" style={{ "--i": 0 } as React.CSSProperties}>
          <Logo />
        </Link>
        <p className="enter tabular mt-10 font-mono text-sm text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>
          404
        </p>
        <h1 className="enter mt-2 text-page" style={{ "--i": 2 } as React.CSSProperties}>
          This shelf is empty.
        </h1>
        <p className="enter mt-3 text-muted-foreground" style={{ "--i": 3 } as React.CSSProperties}>
          The page you&apos;re looking for isn&apos;t here, but plenty of idle kit is waiting to be shared.
        </p>
        <div className="enter mt-8 flex flex-wrap items-center justify-center gap-3" style={{ "--i": 4 } as React.CSSProperties}>
          <Link href="/explore" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
            <Compass data-icon="inline-start" strokeWidth={1.75} /> Explore resources
          </Link>
          <Link href="/" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-5")}>
            <ArrowLeft data-icon="inline-start" strokeWidth={1.75} /> Home
          </Link>
        </div>
        <p className="enter mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground" style={{ "--i": 5 } as React.CSSProperties}>
          Or search everything <PaletteHint />
        </p>
      </div>
    </main>
  );
}
