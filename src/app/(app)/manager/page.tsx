import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Manager desk" };

export default function Page() {
  return <ComingNext title="Manager desk" body="Badge requests, incident reviews with AI summaries, and the overdue list." />;
}
