import type { Metadata } from "next";
import { ComingNext } from "@/components/shell/coming-next";

export const metadata: Metadata = { title: "Skill Passport" };

export default function Page() {
  return (
    <ComingNext
      title="Skill Passport"
      body="Your training badges, pending certificates and what each one unlocks."
      kind="passport"
      bullets={[
        "Badges you hold, and which resources each one unlocks",
        "Upload a training certificate for a manager to review",
        "See pending and revoked badges, with the reason",
      ]}
    />
  );
}
