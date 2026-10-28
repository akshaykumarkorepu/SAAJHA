import { AppShell } from "@/components/shell/app-shell";
import { SessionGate } from "@/components/shell/session";
import { LogoMark } from "@/components/saajha/logo";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionGate
      fallback={
        <div className="grid flex-1 place-items-center" role="status" aria-label="Loading your demo session">
          <LogoMark className="size-10 animate-pulse" />
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
