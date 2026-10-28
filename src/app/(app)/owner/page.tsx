import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Owner console" };

export default function Page() {
  return <ComingNext title="Owner console" body="List equipment, review requests with a readiness summary, and confirm handovers." />;
}
