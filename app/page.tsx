import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Saajha
      </h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Idle labs, shared with trust.
      </p>
      <Button size="lg" render={<Link href="/login" />} nativeButton={false}>
        Log in
      </Button>
    </main>
  );
}
