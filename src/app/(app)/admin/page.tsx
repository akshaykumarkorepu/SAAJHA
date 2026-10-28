import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Admin & ledger" };

export default function Page() {
  return (
    <ComingNext
      title="Admin & ledger"
      body="Users and roles, the hash-chained audit ledger with integrity check, and fairness stats."
      kind="admin"
      bullets={[
        "Manage users and roles",
        "Browse the hash-chained audit ledger and verify its integrity",
        "Fairness dashboard: bookings per user and department, utilisation",
      ]}
    />
  );
}
