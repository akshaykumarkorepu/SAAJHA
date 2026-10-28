import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Manager desk" };

export default function Page() {
  return (
    <ComingNext
      title="Manager desk"
      body="Badge requests, incident reviews with AI summaries, and the overdue list."
      kind="manager"
      bullets={[
        "Review badge requests, with an AI pre-check note to assist",
        "Resolve damage incidents with a written reason and fair penalty",
        "Track overdue returns across the department",
      ]}
    />
  );
}
