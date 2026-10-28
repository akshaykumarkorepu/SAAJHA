import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Admin & ledger" };

export default function Page() {
  return <ComingNext title="Admin & ledger" body="Users and roles, the hash-chained audit ledger with integrity check, and fairness stats." />;
}
