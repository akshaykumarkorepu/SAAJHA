import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Owner console" };

export default function Page() {
  return (
    <ComingNext
      title="Owner console"
      body="List equipment, review requests with a readiness summary, and confirm handovers."
      kind="owner"
      bullets={[
        "List and edit resources, or pause one for maintenance",
        "Approve or reject requests with a written reason, seeing each borrower's readiness",
        "Confirm handovers and compare check-out vs return condition",
      ]}
    />
  );
}
